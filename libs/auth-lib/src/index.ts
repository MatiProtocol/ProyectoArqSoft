export { UserRoleDTO } from './application/dtos/enums/user-role.dto';
export { GetRolesUserHandler } from './application/queries/get-roles-user-handler';
export { GetRolesUserQuery } from './application/queries/get-roles-user-query';
export {
  auth0Breaker,
  isAuth0CircuitOpen,
  resetAuth0Circuit,
  validateTokenWithAuth0Circuit,
} from './infrastructure/auth/auth0-circuit-breaker';
export { validateTokenWithAuth0 } from './infrastructure/auth/auth0-validator';
export { redisClient } from './infrastructure/redis/client';
export { UserReadRepository as UserAuthReadRepository } from './infrastructure/repositories/user.read.repository';
export { attachRoles } from './presentation/middlewares/attach-roles.middleware';
export { ensureUserIdFromToken, validateJwt } from './presentation/middlewares/auth0.middleware';
export { requireRole } from './presentation/middlewares/require-rol.middleware';

import './presentation/types/express';
