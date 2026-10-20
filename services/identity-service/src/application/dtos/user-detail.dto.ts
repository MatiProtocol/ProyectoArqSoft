import type { UserRoleDto } from './enums/user-role';

export type UserDetailDto = {
  id: string;
  email: string;
  roles: UserRoleDto[];
  name: string;
  phone: string;
  city: string;
};
