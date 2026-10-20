import { RegisterUserCommand } from '../../../../../src/application/commands/register-user/register-user.command';
import { RegisterUserHandler } from '../../../../../src/application/commands/register-user/register-user.handler';
import { User } from '../../../../../src/domain/entities/user';
import { UserRole } from '../../../../../src/domain/enums/user-role';
import type { IUserWriteRepository } from '../../../../../src/domain/repositories/user.write.repository';

describe('RegisterUserHandler', () => {
  let mockWriteRepository: jest.Mocked<IUserWriteRepository>;
  let handler: RegisterUserHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      updateRoles: jest.fn(),
    };
    handler = new RegisterUserHandler(mockWriteRepository);
  });

  it('should register a user with default roles if no roles are provided', async () => {
    const command = new RegisterUserCommand(
      'user_123',
      'test@example.com',
      'John Doe',
      '123456789',
      'Uruguay'
    );

    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
    const passedUser = mockWriteRepository.create.mock.calls[0][0];
    expect(passedUser).toBeInstanceOf(User);
    expect(passedUser.id).toBe('user_123');
    expect(passedUser.email).toBe('test@example.com');
    expect(passedUser.name).toBe('John Doe');
    expect(passedUser.phone).toBe('123456789');
    expect(passedUser.city).toBe('Uruguay');
    expect(passedUser.roles).toEqual([UserRole.CLIENT_INDIVIDUAL]);
  });

  it('should register a user with specified roles if they are provided', async () => {
    const command = new RegisterUserCommand(
      'user_123',
      'test@example.com',
      'John Doe',
      '123456789',
      'Uruguay',
      [UserRole.DRIVER, UserRole.ADMIN]
    );

    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
    const passedUser = mockWriteRepository.create.mock.calls[0][0];
    expect(passedUser.roles).toEqual([UserRole.DRIVER, UserRole.ADMIN]);
  });

  it('should register a user with default roles if roles array is empty', async () => {
    const command = new RegisterUserCommand(
      'user_123',
      'test@example.com',
      'John Doe',
      '123456789',
      'Uruguay',
      []
    );

    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
    const passedUser = mockWriteRepository.create.mock.calls[0][0];
    expect(passedUser.roles).toEqual([UserRole.CLIENT_INDIVIDUAL]);
  });

  it('should propagate errors thrown by the repository', async () => {
    const command = new RegisterUserCommand(
      'user_123',
      'test@example.com',
      'John Doe',
      '123456789',
      'Uruguay'
    );

    const dbError = new Error('Database insertion failed');
    mockWriteRepository.create.mockRejectedValueOnce(dbError);

    await expect(handler.execute(command)).rejects.toThrow('Database insertion failed');
    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
  });
});
