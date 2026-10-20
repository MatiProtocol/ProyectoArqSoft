describe('createTrackingRoutes', () => {
  let routerMock: {
    use: jest.Mock;
    post: jest.Mock;
    get: jest.Mock;
  };

  let validateJwt: jest.Mock;
  let ensureUserIdFromToken: jest.Mock;
  let attachRoles: jest.Mock;
  let requireRole: jest.Mock;
  let deviceAuth: jest.Mock;
  let getRolesHandler: object;
  let gpsController: { ingest: jest.Mock };
  let transferController: {
    assign: jest.Mock;
    start: jest.Mock;
    finish: jest.Mock;
    listActive: jest.Mock;
    getPositions: jest.Mock;
  };
  let deviceAuthConfig: { secret: string };

  beforeEach(() => {
    jest.resetModules();

    routerMock = {
      use: jest.fn(),
      post: jest.fn(),
      get: jest.fn(),
    };

    validateJwt = jest.fn();
    ensureUserIdFromToken = jest.fn();
    attachRoles = jest.fn(() => 'attachRolesMiddleware');
    requireRole = jest.fn((...roles) => `requireRoleMiddleware:${roles.join(',')}`);
    deviceAuth = jest.fn(() => 'deviceAuthMiddleware');
    getRolesHandler = {};
    gpsController = { ingest: jest.fn() };
    transferController = {
      assign: jest.fn(),
      start: jest.fn(),
      finish: jest.fn(),
      listActive: jest.fn(),
      getPositions: jest.fn(),
    };
    deviceAuthConfig = { secret: 'device-secret' };

    jest.doMock('express', () => ({
      Router: jest.fn(() => routerMock),
    }));

    jest.doMock('@move/auth-lib', () => ({
      validateJwt,
      ensureUserIdFromToken,
      attachRoles,
      requireRole,
      UserRoleDTO: {
        OPERATOR: 'operator',
        DRIVER: 'driver',
      },
    }));

    jest.doMock('../../../../src/presentation/middlewares/device-auth.middleware', () => ({
      deviceAuth,
    }));

    jest.doMock('../../../../src/presentation/middlewares/with-error-factory', () => ({
      withErrorFactory: jest.fn((middleware) => middleware),
    }));
  });

  function createRoutes() {
    const { createTrackingRoutes } = require('../../../../src/presentation/routes/tracking.routes');

    return createTrackingRoutes({
      getRolesHandler,
      gpsController,
      transferController,
      deviceAuthConfig,
    });
  }

  it('creates and returns an express router', () => {
    const router = createRoutes();

    expect(router).toBe(routerMock);
  });

  it('registers the device-authenticated GPS ingestion endpoint before JWT middlewares', () => {
    createRoutes();

    expect(deviceAuth).toHaveBeenCalledWith(deviceAuthConfig);
    expect(routerMock.post).toHaveBeenCalledWith(
      '/gps/reading',
      'deviceAuthMiddleware',
      expect.any(Function)
    );
  });

  it('registers JWT authentication and role middlewares', () => {
    createRoutes();

    expect(routerMock.use).toHaveBeenCalledWith(validateJwt);
    expect(routerMock.use).toHaveBeenCalledWith(expect.any(Function));
    expect(attachRoles).toHaveBeenCalledWith(getRolesHandler);
  });

  it('registers POST /transfers for the operator role', () => {
    createRoutes();

    expect(requireRole).toHaveBeenCalledWith('operator');
    expect(routerMock.post).toHaveBeenCalledWith(
      '/transfers',
      'requireRoleMiddleware:operator',
      expect.any(Function)
    );
  });

  it('registers POST /transfers/:id/start and /finish for the driver role', () => {
    createRoutes();

    expect(requireRole).toHaveBeenCalledWith('driver');
    expect(routerMock.post).toHaveBeenCalledWith(
      '/transfers/:id/start',
      'requireRoleMiddleware:driver',
      expect.any(Function)
    );
    expect(routerMock.post).toHaveBeenCalledWith(
      '/transfers/:id/finish',
      'requireRoleMiddleware:driver',
      expect.any(Function)
    );
  });

  it('registers GET /active-transfers for the operator role', () => {
    createRoutes();

    expect(routerMock.get).toHaveBeenCalledWith(
      '/active-transfers',
      'requireRoleMiddleware:operator',
      expect.any(Function)
    );
  });

  it('registers GET /transfers/:id/positions for operator and driver roles', () => {
    createRoutes();

    expect(requireRole).toHaveBeenCalledWith('operator', 'driver');
    expect(routerMock.get).toHaveBeenCalledWith(
      '/transfers/:id/positions',
      'requireRoleMiddleware:operator,driver',
      expect.any(Function)
    );
  });

  it('binds the bound controller handlers to the controller instance', () => {
    createRoutes();

    const ingestHandler = routerMock.post.mock.calls.find(
      ([path]: [string]) => path === '/gps/reading'
    )[2];
    gpsController.ingest.mockResolvedValueOnce(undefined);

    ingestHandler({} as never, {} as never);

    expect(gpsController.ingest).toHaveBeenCalledTimes(1);
  });
});
