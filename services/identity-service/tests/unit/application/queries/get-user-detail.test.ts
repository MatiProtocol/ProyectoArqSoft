import type { IUserReadRepository } from '../../../../src/application/contracts/user.read.repository';
import { GetUserDetailHandler } from '../../../../src/application/queries/get-user-detail/get-user-detail-handler';
import { GetUserDetailQuery } from '../../../../src/application/queries/get-user-detail/get-user-detail-query';

describe('GetUserDetailHandler', () => {
  let repository: jest.Mocked<IUserReadRepository>;
  let handler: GetUserDetailHandler;

  beforeEach(() => {
    repository = {
      findAuthDataById: jest.fn(),
      findUserDetailById: jest.fn(),
    };
    handler = new GetUserDetailHandler(repository);
  });

  it('should return full user detail', async () => {
    const user = {
      id: 'auth0|123',
      email: 'test@example.com',
      roles: [],
      name: 'Test User',
      phone: '099123456',
      city: 'Montevideo',
    };
    repository.findUserDetailById.mockResolvedValueOnce(user);

    const result = await handler.execute(new GetUserDetailQuery(' auth0|123 '));

    expect(repository.findUserDetailById).toHaveBeenCalledWith('auth0|123');
    expect(result).toBe(user);
  });

  it('should throw 400 when userId is empty', async () => {
    const error = await handler.execute(new GetUserDetailQuery('   ')).catch((e) => e);
    expect(error.status).toBe(400);
    expect(error.message).toBe('userId is required and cannot be empty or whitespace');
    expect(repository.findUserDetailById).not.toHaveBeenCalled();
  });

  it('should throw 404 when user is not found', async () => {
    repository.findUserDetailById.mockResolvedValueOnce(null);

    const error = await handler.execute(new GetUserDetailQuery('auth0|123')).catch((e) => e);
    expect(error.status).toBe(404);
    expect(error.message).toBe('User not found');
  });
});
