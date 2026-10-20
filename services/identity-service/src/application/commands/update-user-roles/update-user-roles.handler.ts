import { redisClient } from '@move/auth-lib';
import { ErrorFactory } from '@move/errors-lib';
import { UserRole } from '../../../domain/enums/user-role';
import type { IUserWriteRepository } from '../../../domain/repositories/user.write.repository';
import type { IUserReadRepository } from '../../contracts/user.read.repository';
import { UserRoleDto } from '../../dtos/enums/user-role';
import type { UpdateUserRolesCommand } from './update-user-roles.command';

export class UpdateUserRolesHandler {
  constructor(
    private readonly readRepository: IUserReadRepository,
    private readonly writeRepository: IUserWriteRepository
  ) {}

  async execute(command: UpdateUserRolesCommand): Promise<void> {
    const { targetUserId, newRoles, currentUserRoles } = command;

    if (!currentUserRoles || !Array.isArray(currentUserRoles)) {
      throw ErrorFactory.unauthorized('User roles are missing from the authentication context');
    }

    const targetUser = await this.readRepository.findAuthDataById(targetUserId);
    if (!targetUser) {
      throw ErrorFactory.notFound('Target user');
    }
    if (newRoles.includes(UserRole.CLIENT_COMPANY) && newRoles.length > 1) {
      throw ErrorFactory.badRequest('CLIENT_COMPANY role cannot be combined with any other roles.');
    }

    const isAdmin = currentUserRoles.includes(UserRole.ADMIN);
    const isOperator = currentUserRoles.includes(UserRole.OPERATOR);

    if (isAdmin) {
    } else if (isOperator) {
      const targetUserNonDriverRoles = targetUser.roles
        .filter((r) => r !== UserRoleDto.DRIVER)
        .sort();
      const newNonDriverRoles = newRoles.filter((r) => r !== UserRole.DRIVER).sort();

      const isSame =
        targetUserNonDriverRoles.length === newNonDriverRoles.length &&
        targetUserNonDriverRoles.every(
          (val, index) => (val as string) === (newNonDriverRoles[index] as string)
        );

      if (!isSame) {
        throw ErrorFactory.forbidden(
          'Operators can only assign or remove the driver role. No other roles can be modified.'
        );
      }
    } else {
      throw ErrorFactory.forbidden('Insufficient permissions to assign roles.');
    }

    await this.writeRepository.updateRoles(targetUserId, newRoles);
    const cacheKey = `roles:${targetUserId}`;
    try {
      await redisClient.del(cacheKey);
    } catch (cacheError) {
      console.error(`Failed to invalidate cache key ${cacheKey}:`, cacheError);
    }
  }
}
