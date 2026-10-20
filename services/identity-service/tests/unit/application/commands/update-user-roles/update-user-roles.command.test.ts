import { UpdateUserRolesCommand } from '../../../../../src/application/commands/update-user-roles/update-user-roles.command';
import { UserRole } from '../../../../../src/domain/enums/user-role';

describe('UpdateUserRolesCommand.create', () => {
  const currentUserRoles = [UserRole.ADMIN];

  it('should build a command with a roles array', () => {
    const command = UpdateUserRolesCommand.create(
      { targetUserId: 'target-user-id', roles: ['driver'] },
      currentUserRoles
    );

    expect(command).toBeInstanceOf(UpdateUserRolesCommand);
    expect(command.targetUserId).toBe('target-user-id');
    expect(command.newRoles).toEqual([UserRole.DRIVER]);
    expect(command.currentUserRoles).toEqual(currentUserRoles);
  });

  it('should normalize a single role string into an array', () => {
    const command = UpdateUserRolesCommand.create(
      { targetUserId: 'target-user-id', roles: 'operator' },
      currentUserRoles
    );

    expect(command.newRoles).toEqual([UserRole.OPERATOR]);
  });

  it('should preserve currentUserRoles even when undefined (validated later by the handler)', () => {
    const command = UpdateUserRolesCommand.create(
      { targetUserId: 'target-user-id', roles: ['driver'] },
      undefined
    );

    expect(command.currentUserRoles).toBeUndefined();
  });

  it('should throw 400 if target user ID is missing', () => {
    expect(() => UpdateUserRolesCommand.create({ roles: ['driver'] }, currentUserRoles)).toThrow(
      expect.objectContaining({ status: 400, message: 'User ID is required and cannot be empty' })
    );
  });

  it('should throw 400 if body is undefined', () => {
    expect(() => UpdateUserRolesCommand.create(undefined, currentUserRoles)).toThrow(
      expect.objectContaining({ status: 400, message: 'User ID is required and cannot be empty' })
    );
  });

  it('should throw 400 if body is null', () => {
    expect(() => UpdateUserRolesCommand.create(null, currentUserRoles)).toThrow(
      expect.objectContaining({ status: 400, message: 'User ID is required and cannot be empty' })
    );
  });

  it('should throw 400 if target user ID is an empty/whitespace string', () => {
    expect(() =>
      UpdateUserRolesCommand.create({ targetUserId: '   ', roles: ['driver'] }, currentUserRoles)
    ).toThrow(
      expect.objectContaining({ status: 400, message: 'User ID is required and cannot be empty' })
    );
  });

  it('should throw 400 if roles field is missing', () => {
    expect(() =>
      UpdateUserRolesCommand.create({ targetUserId: 'target-user-id' }, currentUserRoles)
    ).toThrow(
      expect.objectContaining({
        status: 400,
        message: 'Roles field is required and cannot be empty',
      })
    );
  });

  it('should throw 400 if roles field is an empty string', () => {
    expect(() =>
      UpdateUserRolesCommand.create({ targetUserId: 'target-user-id', roles: '' }, currentUserRoles)
    ).toThrow(
      expect.objectContaining({
        status: 400,
        message: 'Roles field is required and cannot be empty',
      })
    );
  });

  it('should throw 400 if roles field contains an invalid role', () => {
    expect(() =>
      UpdateUserRolesCommand.create(
        { targetUserId: 'target-user-id', roles: ['driver', 'invalid-role'] },
        currentUserRoles
      )
    ).toThrow(expect.objectContaining({ status: 400, message: 'Invalid role: invalid-role' }));
  });
});
