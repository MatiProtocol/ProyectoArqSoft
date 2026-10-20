import type { UserRolesDTO } from '../../application/dtos/user-roles.dto';

export interface IUserReadRepository {
  findAuthDataByAuth0Id(id: string): Promise<UserRolesDTO | null>;
}
