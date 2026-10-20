import type { NextFunction, Request, Response } from 'express';
import { UserRoleDTO } from '../../../../src/application/dtos/enums/user-role.dto';
import { requireRole } from '../../../../src/presentation/middlewares/require-rol.middleware';

interface CustomRequest extends Request {
  user?: {
    id: string;
    roles: UserRoleDTO[];
  };
}

function hasStatus(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof (error as { status: number }).status === 'number'
  );
}

describe('requireRole middleware (throws errors)', () => {
  let req: CustomRequest;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = { user: undefined } as CustomRequest;
    res = {} as Response;
    next = jest.fn();
  });

  describe('when user is not authenticated (req.user missing)', () => {
    it('should throw an error with status 401 and "Authentication required"', () => {
      const middleware = requireRole(UserRoleDTO.ADMIN);
      expect(() => middleware(req, res, next)).toThrow('Authentication required');
      try {
        middleware(req, res, next);
      } catch (error) {
        expect(hasStatus(error)).toBe(true);
        if (hasStatus(error)) {
          expect(error.message).toBe('Authentication required');
          expect(error.status).toBe(401);
        }
      }
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      req.user = {
        id: 'user123',
        roles: [UserRoleDTO.CLIENT_INDIVIDUAL, UserRoleDTO.OPERATOR],
      };
    });

    it('should call next() if user has at least one allowed role', () => {
      const middleware = requireRole(UserRoleDTO.OPERATOR, UserRoleDTO.ADMIN);
      expect(() => middleware(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should throw an error with status 403 if user has none of the allowed roles', () => {
      const middleware = requireRole(UserRoleDTO.ADMIN, UserRoleDTO.DRIVER);
      expect(() => middleware(req, res, next)).toThrow(
        'Insufficient permissions to perform this action'
      );
      try {
        middleware(req, res, next);
      } catch (error) {
        expect(hasStatus(error)).toBe(true);
        if (hasStatus(error)) {
          expect(error.message).toBe('Insufficient permissions to perform this action');
          expect(error.status).toBe(403);
        }
      }
      expect(next).not.toHaveBeenCalled();
    });

    it('should work with a single allowed role', () => {
      const middleware = requireRole(UserRoleDTO.CLIENT_INDIVIDUAL);
      expect(() => middleware(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });

    it('should throw 403 when allowed roles array is empty', () => {
      const middleware = requireRole();
      expect(() => middleware(req, res, next)).toThrow(
        'Insufficient permissions to perform this action'
      );
      let caughtError: unknown;
      try {
        middleware(req, res, next);
      } catch (e) {
        caughtError = e;
      }
      expect(hasStatus(caughtError)).toBe(true);
      if (hasStatus(caughtError)) {
        expect(caughtError.status).toBe(403);
      }
      expect(next).not.toHaveBeenCalled();
    });
  });
});
