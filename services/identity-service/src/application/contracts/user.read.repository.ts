import type { UserAuthDto } from '../dtos/user-auth.dto';
import type { UserDetailDto } from '../dtos/user-detail.dto';

export interface IUserReadRepository {
  findAuthDataById(id: string): Promise<UserAuthDto | null>;
  findUserDetailById(id: string): Promise<UserDetailDto | null>;
}
