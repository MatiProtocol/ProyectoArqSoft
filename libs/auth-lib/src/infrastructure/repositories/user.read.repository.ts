import type { UserRoleDTO } from '../../application/dtos/enums/user-role.dto';
import type { UserRolesDTO } from '../../application/dtos/user-roles.dto';
import type { IUserReadRepository } from '../../domain/repositories/user.read.repository';

interface CollectionReader<TDocument> {
  findOne(
    filter: Partial<TDocument>,
    options?: { projection?: Partial<Record<keyof TDocument, 0 | 1>> }
  ): Promise<TDocument | null>;
}

interface UserAuthDatabase {
  collection<TDocument>(name: string): CollectionReader<TDocument>;
}

interface UserDocument {
  _id: string;
  roles: UserRoleDTO[];
}

export class UserReadRepository implements IUserReadRepository {
  constructor(private readonly db: UserAuthDatabase) {}

  async findAuthDataByAuth0Id(auth0Id: string): Promise<UserRolesDTO | null> {
    const user = await this.db
      .collection<UserDocument>('users')
      .findOne({ _id: auth0Id }, { projection: { _id: 1, roles: 1 } });
    if (!user) return null;
    return {
      id: user._id,
      roles: user.roles as UserRoleDTO[],
    };
  }
}
