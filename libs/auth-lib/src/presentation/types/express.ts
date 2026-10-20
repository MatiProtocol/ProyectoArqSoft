import type { UserRoleDTO } from '../../application/dtos/enums/user-role.dto';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles: UserRoleDTO[];
      };
    }
  }
}
