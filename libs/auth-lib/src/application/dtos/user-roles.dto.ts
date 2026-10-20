import type { UserRoleDTO } from './enums/user-role.dto';

export type UserRolesDTO = {
  id: string;
  roles: UserRoleDTO[];
};
