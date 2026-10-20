import type { UserRoleDto } from './enums/user-role';

export type UserAuthDto = {
  id: string;
  email: string;
  roles: UserRoleDto[];
};
