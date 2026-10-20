import {
  attachRoles,
  ensureUserIdFromToken,
  GetRolesUserHandler,
  requireRole,
  UserAuthReadRepository,
  UserRoleDTO,
  validateJwt,
} from '@move/auth-lib';
import { Router } from 'express';
import { RegisterUserHandler } from '../../application/commands/register-user/register-user.handler';
import { UpdateUserRolesHandler } from '../../application/commands/update-user-roles/update-user-roles.handler';
import { GetUserDetailHandler } from '../../application/queries/get-user-detail/get-user-detail-handler';
import { UserReadRepository } from '../../infrastructure/repositories/user.read.repository';
import { UserWriteRepository } from '../../infrastructure/repositories/user.write.repository';
import { InternalUserController } from '../controllers/internal-user.controller';
import { RegisterController } from '../controllers/register.controller';
import { UserRolesController } from '../controllers/user-roles.controller';
import { requireInternalToken } from '../middlewares/require-internal-token';

interface CollectionReader<TDocument> {
  findOne(
    filter: Partial<TDocument>,
    options?: { projection?: Partial<Record<keyof TDocument, 0 | 1>> }
  ): Promise<TDocument | null>;
}

export interface IdentityDatabase {
  collection<TDocument>(name: string): CollectionReader<TDocument>;
}

export function createIdentityRoutes(db: IdentityDatabase) {
  const identityRoutes = Router();
  const userRepository = new UserReadRepository();
  const userAuthReadRepo = new UserAuthReadRepository(db);
  const internalUserController = new InternalUserController(
    new GetUserDetailHandler(userRepository)
  );
  const userWriteRepository = new UserWriteRepository();
  const registerController = new RegisterController(new RegisterUserHandler(userWriteRepository));
  const getRolesHandler = new GetRolesUserHandler(userAuthReadRepo);
  const updateRolesHandler = new UpdateUserRolesHandler(userRepository, userWriteRepository);
  const userRolesController = new UserRolesController(updateRolesHandler);

  identityRoutes.get(
    '/internal/users/:userId',
    requireInternalToken(),
    internalUserController.getById.bind(internalUserController)
  );

  identityRoutes.use(validateJwt);
  identityRoutes.use(ensureUserIdFromToken);
  identityRoutes.post('/register', registerController.register.bind(registerController));
  identityRoutes.use(attachRoles(getRolesHandler));
  identityRoutes.patch(
    '/users/roles',
    requireRole(UserRoleDTO.ADMIN, UserRoleDTO.OPERATOR),
    userRolesController.updateRoles.bind(userRolesController)
  );

  return identityRoutes;
}
