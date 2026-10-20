import type { NextFunction, Request, Response } from 'express';
import type { Db } from 'mongodb';

jest.mock('@move/auth-lib', () => ({
  validateJwt: jest.fn((_req: Request, _res: Response, next: NextFunction) => next()),
  ensureUserIdFromToken: jest.fn(),
  attachRoles: jest.fn(() => 'attachRolesMiddleware'),
  requireRole: jest.fn(() => 'requireRoleMiddleware'),
  UserAuthReadRepository: jest.fn(),
  GetRolesUserHandler: jest.fn(),
  UserRoleDTO: {
    ADMIN: 'ADMIN',
    OPERATOR: 'OPERATOR',
    DRIVER: 'DRIVER',
    CLIENT_COMPANY: 'CLIENT_COMPANY',
    CLIENT_INDIVIDUAL: 'CLIENT_INDIVIDUAL',
  },
}));

describe('createIdentityRoutes', () => {
  let routerMock: {
    use: jest.Mock;
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
  };

  let validateJwt: jest.Mock;
  let ensureUserIdFromToken: jest.Mock;
  let attachRoles: jest.Mock;
  let requireRole: jest.Mock;

  let UserAuthReadRepository: jest.Mock;
  let GetRolesUserHandler: jest.Mock;

  let UserReadRepository: jest.Mock;
  let GetUserDetailHandler: jest.Mock;
  let InternalUserController: jest.Mock;

  let UpdateUserRolesHandler: jest.Mock;
  let UserRolesController: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    routerMock = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };

    const authLib = require('@move/auth-lib');
    validateJwt = authLib.validateJwt;
    ensureUserIdFromToken = authLib.ensureUserIdFromToken;
    attachRoles = authLib.attachRoles;
    requireRole = authLib.requireRole;
    UserAuthReadRepository = authLib.UserAuthReadRepository;
    GetRolesUserHandler = authLib.GetRolesUserHandler;

    validateJwt.mockClear();
    ensureUserIdFromToken.mockClear();
    attachRoles.mockClear().mockImplementation(() => 'attachRolesMiddleware');
    requireRole.mockClear().mockImplementation(() => 'requireRoleMiddleware');
    UserAuthReadRepository.mockClear();
    GetRolesUserHandler.mockClear();

    UserReadRepository = jest.fn();
    GetUserDetailHandler = jest.fn();

    InternalUserController = jest.fn(() => ({
      getById: jest.fn(),
    }));

    UpdateUserRolesHandler = jest.fn();
    UserRolesController = jest.fn(() => ({
      updateRoles: jest.fn(),
    }));

    jest.doMock('express', () => ({
      Router: jest.fn(() => routerMock),
    }));

    jest.doMock('../../../../src/infrastructure/repositories/user.read.repository', () => ({
      UserReadRepository,
    }));

    jest.doMock(
      '../../../../src/application/queries/get-user-detail/get-user-detail-handler',
      () => ({
        GetUserDetailHandler,
      })
    );

    jest.doMock('../../../../src/presentation/controllers/internal-user.controller', () => ({
      InternalUserController,
    }));

    jest.doMock(
      '../../../../src/application/commands/update-user-roles/update-user-roles.handler',
      () => ({
        UpdateUserRolesHandler,
      })
    );

    jest.doMock('../../../../src/presentation/controllers/user-roles.controller', () => ({
      UserRolesController,
    }));
  });

  it('creates and returns an express router', () => {
    const { createIdentityRoutes } = require('../../../../src/presentation/routes/identity.routes');

    const db = {} as Db;

    const router = createIdentityRoutes(db);

    expect(router).toBe(routerMock);
  });

  it('creates repositories and handlers with correct dependencies', () => {
    const { createIdentityRoutes } = require('../../../../src/presentation/routes/identity.routes');

    const db = {} as Db;

    createIdentityRoutes(db);

    expect(UserReadRepository).toHaveBeenCalledTimes(1);

    UserReadRepository.mock.instances[0];

    expect(InternalUserController).toHaveBeenCalledWith(GetUserDetailHandler.mock.instances[0]);

    expect(UserAuthReadRepository).toHaveBeenCalledWith(db);

    const authRepoInstance = UserAuthReadRepository.mock.instances[0];

    expect(GetRolesUserHandler).toHaveBeenCalledWith(authRepoInstance);
  });

  it('registers authentication middlewares in the correct order', () => {
    const { createIdentityRoutes } = require('../../../../src/presentation/routes/identity.routes');

    const db = {} as Db;

    createIdentityRoutes(db);

    expect(routerMock.use).toHaveBeenNthCalledWith(1, validateJwt);

    expect(routerMock.use).toHaveBeenNthCalledWith(2, ensureUserIdFromToken);

    expect(attachRoles).toHaveBeenCalledTimes(1);

    const rolesHandler = GetRolesUserHandler.mock.instances[0];

    expect(attachRoles).toHaveBeenCalledWith(rolesHandler);

    expect(routerMock.use).toHaveBeenNthCalledWith(3, 'attachRolesMiddleware');
  });

  it('registers GET /internal/users/:userId before authentication middlewares', () => {
    const { createIdentityRoutes } = require('../../../../src/presentation/routes/identity.routes');

    const db = {} as Db;

    createIdentityRoutes(db);

    expect(routerMock.get).toHaveBeenCalledWith(
      '/internal/users/:userId',
      expect.any(Function),
      expect.any(Function)
    );
    expect(routerMock.get.mock.invocationCallOrder[0]).toBeLessThan(
      routerMock.use.mock.invocationCallOrder[0]
    );
  });
});
