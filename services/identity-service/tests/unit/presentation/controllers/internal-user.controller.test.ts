import type { Request, Response } from 'express';
import type { GetUserDetailHandler } from '../../../../src/application/queries/get-user-detail/get-user-detail-handler';
import { GetUserDetailQuery } from '../../../../src/application/queries/get-user-detail/get-user-detail-query';
import { InternalUserController } from '../../../../src/presentation/controllers/internal-user.controller';

const execute = jest.fn();

describe('InternalUserController', () => {
  let controller: InternalUserController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new InternalUserController({
      execute,
    } as unknown as GetUserDetailHandler);
    req = {
      params: {
        userId: 'auth0|123',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('should return user detail', async () => {
    const user = {
      id: 'auth0|123',
      email: 'test@example.com',
      roles: [],
      name: 'Test User',
      phone: '099123456',
      city: 'Montevideo',
    };
    execute.mockResolvedValueOnce(user);

    await controller.getById(req as Request, res as Response);

    expect(execute).toHaveBeenCalledWith(expect.any(GetUserDetailQuery));
    expect(execute.mock.calls[0][0].userId).toBe('auth0|123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(user);
  });
});
