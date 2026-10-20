import { redisClient } from '@move/auth-lib';
import { UpdateUserRolesCommand } from '../../../../../src/application/commands/update-user-roles/update-user-roles.command';
import { UpdateUserRolesHandler } from '../../../../../src/application/commands/update-user-roles/update-user-roles.handler';
import type { IUserReadRepository } from '../../../../../src/application/contracts/user.read.repository';
import { UserRoleDto } from '../../../../../src/application/dtos/enums/user-role';
import { UserRole } from '../../../../../src/domain/enums/user-role';
import type { IUserWriteRepository } from '../../../../../src/domain/repositories/user.write.repository';

jest.mock('@move/auth-lib', () => ({
  redisClient: {
    del: jest.fn(),
  },
}));

const mockRedisDel = redisClient.del as jest.Mock;

describe('UpdateUserRolesHandler', () => {
  let mockReadRepository: jest.Mocked<IUserReadRepository>;
  let mockWriteRepository: jest.Mocked<IUserWriteRepository>;
  let handler: UpdateUserRolesHandler;

  beforeEach(() => {
    mockReadRepository = {
      findAuthDataById: jest.fn(),
      findUserDetailById: jest.fn(),
    };
    mockWriteRepository = {
      create: jest.fn(),
      updateRoles: jest.fn(),
    };
    handler = new UpdateUserRolesHandler(mockReadRepository, mockWriteRepository);
    jest.clearAllMocks();
  });

  it('should throw 401 if currentUserRoles is missing from the authentication context', async () => {
    const command = new UpdateUserRolesCommand('user_123', [UserRole.DRIVER], undefined);

    await expect(handler.execute(command)).rejects.toMatchObject({
      status: 401,
      message: 'User roles are missing from the authentication context',
    });

    expect(mockReadRepository.findAuthDataById).not.toHaveBeenCalled();
    expect(mockWriteRepository.updateRoles).not.toHaveBeenCalled();
  });

  it('should throw 404 if the target user does not exist', async () => {
    const command = new UpdateUserRolesCommand('user_123', [UserRole.DRIVER], [UserRole.ADMIN]);

    mockReadRepository.findAuthDataById.mockResolvedValueOnce(null);

    const error = await handler.execute(command).catch((e) => e);
    expect(error.status).toBe(404);
    expect(error.message).toBe('Target user not found');
  });

  it('should throw 400 if CLIENT_COMPANY role is combined with other roles', async () => {
    const command = new UpdateUserRolesCommand(
      'user_123',
      [UserRole.CLIENT_COMPANY, UserRole.DRIVER],
      [UserRole.ADMIN]
    );
    mockReadRepository.findAuthDataById.mockResolvedValueOnce({
      id: 'user_123',
      email: 'target@example.com',
      roles: [UserRoleDto.CLIENT_COMPANY],
    });

    await expect(handler.execute(command)).rejects.toMatchObject({
      status: 400,
      message: 'CLIENT_COMPANY role cannot be combined with any other roles.',
    });

    expect(mockWriteRepository.updateRoles).not.toHaveBeenCalled();
  });

  describe('Admin execution', () => {
    beforeEach(() => {
      mockReadRepository.findAuthDataById.mockResolvedValue({
        id: 'user_123',
        email: 'target@example.com',
        roles: [UserRoleDto.CLIENT_INDIVIDUAL],
      });
    });

    it('should successfully update user roles to any valid set of roles', async () => {
      const command = new UpdateUserRolesCommand(
        'user_123',
        [UserRole.CLIENT_INDIVIDUAL, UserRole.DRIVER, UserRole.OPERATOR],
        [UserRole.ADMIN]
      );
      mockWriteRepository.updateRoles.mockResolvedValueOnce(undefined);
      mockRedisDel.mockResolvedValueOnce(1);

      await handler.execute(command);

      expect(mockWriteRepository.updateRoles).toHaveBeenCalledWith('user_123', [
        UserRole.CLIENT_INDIVIDUAL,
        UserRole.DRIVER,
        UserRole.OPERATOR,
      ]);
      expect(mockRedisDel).toHaveBeenCalledWith('roles:user_123');
    });

    it('should successfully update to CLIENT_COMPANY alone', async () => {
      const command = new UpdateUserRolesCommand(
        'user_123',
        [UserRole.CLIENT_COMPANY],
        [UserRole.ADMIN]
      );
      mockWriteRepository.updateRoles.mockResolvedValueOnce(undefined);
      mockRedisDel.mockResolvedValueOnce(1);

      await handler.execute(command);

      expect(mockWriteRepository.updateRoles).toHaveBeenCalledWith('user_123', [
        UserRole.CLIENT_COMPANY,
      ]);
    });
  });

  describe('Operator execution', () => {
    it('should successfully add driver role when current user is operator and user had client_individual', async () => {
      mockReadRepository.findAuthDataById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'target@example.com',
        roles: [UserRoleDto.CLIENT_INDIVIDUAL],
      });
      const command = new UpdateUserRolesCommand(
        'user_123',
        [UserRole.CLIENT_INDIVIDUAL, UserRole.DRIVER],
        [UserRole.OPERATOR]
      );
      mockWriteRepository.updateRoles.mockResolvedValueOnce(undefined);
      mockRedisDel.mockResolvedValueOnce(1);

      await handler.execute(command);

      expect(mockWriteRepository.updateRoles).toHaveBeenCalledWith('user_123', [
        UserRole.CLIENT_INDIVIDUAL,
        UserRole.DRIVER,
      ]);
      expect(mockRedisDel).toHaveBeenCalledWith('roles:user_123');
    });

    it('should successfully remove driver role when current user is operator', async () => {
      mockReadRepository.findAuthDataById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'target@example.com',
        roles: [UserRoleDto.CLIENT_INDIVIDUAL, UserRoleDto.DRIVER],
      });
      const command = new UpdateUserRolesCommand(
        'user_123',
        [UserRole.CLIENT_INDIVIDUAL],
        [UserRole.OPERATOR]
      );
      mockWriteRepository.updateRoles.mockResolvedValueOnce(undefined);
      mockRedisDel.mockResolvedValueOnce(1);

      await handler.execute(command);

      expect(mockWriteRepository.updateRoles).toHaveBeenCalledWith('user_123', [
        UserRole.CLIENT_INDIVIDUAL,
      ]);
    });

    it('should throw 403 if operator tries to modify roles other than driver', async () => {
      mockReadRepository.findAuthDataById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'target@example.com',
        roles: [UserRoleDto.CLIENT_INDIVIDUAL],
      });
      const command = new UpdateUserRolesCommand(
        'user_123',
        [UserRole.CLIENT_INDIVIDUAL, UserRole.ADMIN],
        [UserRole.OPERATOR]
      );

      await expect(handler.execute(command)).rejects.toMatchObject({
        status: 403,
        message:
          'Operators can only assign or remove the driver role. No other roles can be modified.',
      });

      expect(mockWriteRepository.updateRoles).not.toHaveBeenCalled();
    });

    it('should throw 403 if operator tries to add operator role', async () => {
      mockReadRepository.findAuthDataById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'target@example.com',
        roles: [UserRoleDto.CLIENT_INDIVIDUAL],
      });
      const command = new UpdateUserRolesCommand(
        'user_123',
        [UserRole.CLIENT_INDIVIDUAL, UserRole.OPERATOR],
        [UserRole.OPERATOR]
      );

      await expect(handler.execute(command)).rejects.toMatchObject({
        status: 403,
        message:
          'Operators can only assign or remove the driver role. No other roles can be modified.',
      });
    });
  });

  describe('Unauthorized execution', () => {
    beforeEach(() => {
      mockReadRepository.findAuthDataById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'target@example.com',
        roles: [UserRoleDto.CLIENT_INDIVIDUAL],
      });
    });

    it('should throw 403 if current user is neither admin nor operator', async () => {
      const command = new UpdateUserRolesCommand(
        'user_123',
        [UserRole.CLIENT_INDIVIDUAL, UserRole.DRIVER],
        [UserRole.CLIENT_INDIVIDUAL]
      );

      await expect(handler.execute(command)).rejects.toMatchObject({
        status: 403,
        message: 'Insufficient permissions to assign roles.',
      });

      expect(mockWriteRepository.updateRoles).not.toHaveBeenCalled();
    });
  });

  describe('Redis failure tolerance', () => {
    it('should not throw if Redis invalidation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockReadRepository.findAuthDataById.mockResolvedValueOnce({
        id: 'user_123',
        email: 'target@example.com',
        roles: [UserRoleDto.CLIENT_INDIVIDUAL],
      });
      const command = new UpdateUserRolesCommand(
        'user_123',
        [UserRole.CLIENT_INDIVIDUAL, UserRole.DRIVER],
        [UserRole.OPERATOR]
      );
      mockWriteRepository.updateRoles.mockResolvedValueOnce(undefined);
      mockRedisDel.mockRejectedValueOnce(new Error('Redis connection lost'));

      await expect(handler.execute(command)).resolves.not.toThrow();

      expect(mockWriteRepository.updateRoles).toHaveBeenCalledWith('user_123', [
        UserRole.CLIENT_INDIVIDUAL,
        UserRole.DRIVER,
      ]);
      expect(mockRedisDel).toHaveBeenCalledWith('roles:user_123');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to invalidate cache key roles:user_123:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
