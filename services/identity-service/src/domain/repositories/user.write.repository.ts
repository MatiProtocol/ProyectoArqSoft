import type { User } from '../entities/user';
import type { UserRole } from '../enums/user-role';

export interface IUserWriteRepository {
  create(user: User): Promise<void>;
  updateRoles(id: string, roles: UserRole[]): Promise<void>;
}
