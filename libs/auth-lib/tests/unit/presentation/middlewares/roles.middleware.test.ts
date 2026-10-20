import type { NextFunction, Request, Response } from 'express';
import { UserRoleDTO } from '../../../../src/application/dtos/enums/user-role.dto';
import type { GetRolesUserHandler } from '../../../../src/application/queries/get-roles-user-handler';
import { GetRolesUserQuery } from '../../../../src/application/queries/get-roles-user-query';
import { redisClient } from '../../../../src/infrastructure/redis/client';
import { attachRoles } from '../../../../src/presentation/middlewares/attach-roles.middleware';

interface CustomRequest extends Request {
  user?: {
    id: string;
    roles: UserRoleDTO[];
  };
  auth?: {
    header: Record<string, unknown>;
    payload: { sub: 'auth0|123' };
    token: string;
  };
}

jest.mock('../../../../src/infrastructure/redis/client', () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn(),
  },
}));

const mockRedisGet = redisClient.get as jest.Mock;
const mockRedisSetEx = redisClient.setEx as jest.Mock;

const mockHandlerExecute = jest.fn();
const mockHandler: jest.Mocked<GetRolesUserHandler> = {
  execute: mockHandlerExecute,
} as unknown as jest.Mocked<GetRolesUserHandler>;

describe('attachRolesMiddleware', () => {
  let middleware: ReturnType<typeof attachRoles>;
  let req: Partial<CustomRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    middleware = attachRoles(mockHandler);
    req = {
      user: {
        id: 'auth0|123',
        roles: [],
      },
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('cache hit', () => {
    const cachedRolesJson = JSON.stringify([UserRoleDTO.ADMIN, UserRoleDTO.CLIENT_INDIVIDUAL]);

    beforeEach(() => {
      mockRedisGet.mockResolvedValue(cachedRolesJson);
    });

    it('should use cached roles, attach user to request, and call next without hitting handler', async () => {
      await middleware(req as CustomRequest, res as Response, next);

      expect(mockRedisGet).toHaveBeenCalledWith('roles:auth0|123');
      expect(mockHandlerExecute).not.toHaveBeenCalled();
      expect(mockRedisSetEx).not.toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'auth0|123',
        roles: ['admin', 'client_individual'],
      });
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('cache miss but user exists', () => {
    const userRoles = ['operator', 'driver'];
    const userData = { id: 'auth0|123', roles: userRoles };

    beforeEach(() => {
      mockRedisGet.mockResolvedValue(null);
      mockHandlerExecute.mockResolvedValue(userData);
    });

    it('should fetch roles from handler, cache them, attach user, and call next', async () => {
      await middleware(req as CustomRequest, res as Response, next);

      expect(mockRedisGet).toHaveBeenCalledWith('roles:auth0|123');
      expect(mockHandlerExecute).toHaveBeenCalledTimes(1);
      expect(mockHandlerExecute).toHaveBeenCalledWith(expect.any(GetRolesUserQuery));
      const queryArg = mockHandlerExecute.mock.calls[0][0];
      expect(queryArg).toBeInstanceOf(GetRolesUserQuery);
      if ('sub' in queryArg) {
        expect((queryArg as { sub: string }).sub).toBe('auth0|123');
      }
      expect(mockRedisSetEx).toHaveBeenCalledWith(
        'roles:auth0|123',
        900,
        JSON.stringify(userRoles)
      );
      expect(req.user).toEqual({
        id: 'auth0|123',
        roles: userRoles,
      });
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('cache miss and handler throws', () => {
    it('should call next with error if handler throws (user not found)', async () => {
      mockRedisGet.mockResolvedValue(null);
      const handlerError = new Error('User not found');
      (handlerError as { status?: number }).status = 404;
      mockHandlerExecute.mockRejectedValue(handlerError);

      await middleware(req as CustomRequest, res as Response, next);

      expect(mockRedisGet).toHaveBeenCalled();
      expect(mockHandlerExecute).toHaveBeenCalled();
      expect(mockRedisSetEx).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(handlerError);
    });

    it('should call next with error if handler throws a generic error', async () => {
      mockRedisGet.mockResolvedValue(null);
      const dbError = new Error('Database connection lost');
      mockHandlerExecute.mockRejectedValue(dbError);

      await middleware(req as CustomRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('redis errors', () => {
    it('should call next with error if redisClient.get throws', async () => {
      const redisError = new Error('Redis connection failed');
      mockRedisGet.mockRejectedValue(redisError);

      await middleware(req as CustomRequest, res as Response, next);

      expect(mockHandlerExecute).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(redisError);
    });

    it('should call next with error if redisClient.setEx throws', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockHandlerExecute.mockResolvedValue({ id: 'auth0|123', roles: ['admin'] });
      const setExError = new Error('Redis write failed');
      mockRedisSetEx.mockRejectedValue(setExError);

      await middleware(req as CustomRequest, res as Response, next);

      expect(mockRedisSetEx).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(setExError);
    });
  });
});
