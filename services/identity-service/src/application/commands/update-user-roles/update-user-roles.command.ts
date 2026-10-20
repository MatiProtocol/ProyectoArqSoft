import { ErrorFactory } from '@move/errors-lib';
import { UserRole } from '../../../domain/enums/user-role';
export class UpdateUserRolesCommand {
  constructor(
    public readonly targetUserId: string,
    public readonly newRoles: UserRole[],
    public readonly currentUserRoles: string[] | undefined
  ) {}

  static create(body: unknown, currentUserRoles: string[] | undefined): UpdateUserRolesCommand {
    const { targetUserId, roles } = (body ?? {}) as { targetUserId?: unknown; roles?: unknown };

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      throw ErrorFactory.badRequest('User ID is required and cannot be empty');
    }

    if (roles === undefined || roles === null || roles === '') {
      throw ErrorFactory.badRequest('Roles field is required and cannot be empty');
    }

    const arrayToValidate = Array.isArray(roles) ? roles : [roles];
    const rolesArray: UserRole[] = [];

    for (const r of arrayToValidate) {
      if (typeof r !== 'string' || !Object.values(UserRole).includes(r as UserRole)) {
        throw ErrorFactory.badRequest(`Invalid role: ${r}`);
      }
      rolesArray.push(r as UserRole);
    }

    return new UpdateUserRolesCommand(targetUserId, rolesArray, currentUserRoles);
  }
}
