import type { IUserReadRepository } from '../../application/contracts/user.read.repository';
import type { UserRoleDto } from '../../application/dtos/enums/user-role';
import type { UserAuthDto } from '../../application/dtos/user-auth.dto';
import type { UserDetailDto } from '../../application/dtos/user-detail.dto';
import { UserModel } from '../models/user.model';

export class UserReadRepository implements IUserReadRepository {
  async findAuthDataById(id: string): Promise<UserAuthDto | null> {
    const userDocument = await UserModel.findById(id).select('_id email roles').lean();

    if (!userDocument) return null;

    return {
      id: userDocument._id.toString(),
      email: userDocument.email,
      roles: userDocument.roles.map((role) => role.toString() as UserRoleDto),
    };
  }

  async findUserDetailById(id: string): Promise<UserDetailDto | null> {
    const userDocument = await UserModel.findById(id)
      .select('_id email roles name phone city')
      .lean();

    if (!userDocument) return null;

    return {
      id: userDocument._id.toString(),
      email: userDocument.email,
      roles: userDocument.roles.map((role) => role.toString() as UserRoleDto),
      name: userDocument.name,
      phone: userDocument.phone,
      city: userDocument.city,
    };
  }
}
