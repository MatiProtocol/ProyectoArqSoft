describe('createBookingRoutes', () => {
  let routerMock: {
    use: jest.Mock;
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };

  let validateJwt: jest.Mock;
  let ensureUserIdFromToken: jest.Mock;
  let attachRoles: jest.Mock;
  let requireRole: jest.Mock;
  let getRolesHandler: object;
  let createBookingController: { create: jest.Mock };
  let createCompanyBookingController: { create: jest.Mock };
  let listCustomerBookingsController: { list: jest.Mock };
  let companyPreregistrationController: {
    get: jest.Mock;
    addOrigin: jest.Mock;
    updateOrigin: jest.Mock;
    removeOrigin: jest.Mock;
    addDestination: jest.Mock;
    updateDestination: jest.Mock;
    removeDestination: jest.Mock;
    addItem: jest.Mock;
    updateItem: jest.Mock;
    removeItem: jest.Mock;
  };
  let manualClassifyBookingController: {
    classify: jest.Mock;
    claimNext: jest.Mock;
    reject: jest.Mock;
  };
  let quoteBookingController: { quote: jest.Mock };
  let payBookingController: { pay: jest.Mock };

  beforeEach(() => {
    jest.resetModules();

    routerMock = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    validateJwt = jest.fn();
    ensureUserIdFromToken = jest.fn();
    attachRoles = jest.fn(() => 'attachRolesMiddleware');
    requireRole = jest.fn((role) => `requireRoleMiddleware:${role}`);
    getRolesHandler = {};
    createBookingController = { create: jest.fn() };
    createCompanyBookingController = { create: jest.fn() };
    listCustomerBookingsController = { list: jest.fn() };
    companyPreregistrationController = {
      get: jest.fn(),
      addOrigin: jest.fn(),
      updateOrigin: jest.fn(),
      removeOrigin: jest.fn(),
      addDestination: jest.fn(),
      updateDestination: jest.fn(),
      removeDestination: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
    };
    manualClassifyBookingController = {
      classify: jest.fn(),
      claimNext: jest.fn(),
      reject: jest.fn(),
    };
    quoteBookingController = { quote: jest.fn() };
    payBookingController = { pay: jest.fn() };

    jest.doMock('express', () => ({
      Router: jest.fn(() => routerMock),
    }));

    jest.doMock('@move/auth-lib', () => ({
      validateJwt,
      ensureUserIdFromToken,
      attachRoles,
      requireRole,
      UserRoleDTO: {
        CLIENT_COMPANY: 'client_company',
        CLIENT_INDIVIDUAL: 'client_individual',
        OPERATOR: 'operator',
      },
    }));
  });

  function createRoutes() {
    const { createBookingRoutes } = require('../../../../src/presentation/routes/booking.routes');

    return createBookingRoutes({
      getRolesHandler,
      createBookingController,
      createCompanyBookingController,
      listCustomerBookingsController,
      companyPreregistrationController,
      manualClassifyBookingController,
      quoteBookingController,
      payBookingController,
    });
  }

  it('creates and returns an express router', () => {
    const router = createRoutes();

    expect(router).toBe(routerMock);
  });

  it('registers authentication and role middlewares in order', () => {
    createRoutes();

    expect(routerMock.use).toHaveBeenNthCalledWith(1, validateJwt);
    expect(routerMock.use).toHaveBeenNthCalledWith(2, ensureUserIdFromToken);
    expect(attachRoles).toHaveBeenCalledWith(getRolesHandler);
    expect(routerMock.use).toHaveBeenNthCalledWith(3, 'attachRolesMiddleware');
    expect(requireRole).toHaveBeenCalledWith('client_individual');
    expect(requireRole).toHaveBeenCalledWith('client_company');
    expect(requireRole).toHaveBeenCalledWith('operator');
  });

  it('registers POST /individual endpoint', () => {
    createRoutes();

    expect(routerMock.post).toHaveBeenCalledWith(
      '/individual',
      'requireRoleMiddleware:client_individual',
      expect.any(Function)
    );
  });

  it('registers GET / endpoint for customer booking queries', () => {
    createRoutes();

    expect(routerMock.get).toHaveBeenCalledWith(
      '/',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
  });

  it('registers POST /company endpoint', () => {
    createRoutes();

    expect(routerMock.post).toHaveBeenCalledWith(
      '/company',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
  });

  it('registers company preregistration endpoints', () => {
    createRoutes();

    expect(routerMock.get).toHaveBeenCalledWith(
      '/company/preregistration',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.post).toHaveBeenCalledWith(
      '/company/preregistration/origins',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.patch).toHaveBeenCalledWith(
      '/company/preregistration/origins/:locationId',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.delete).toHaveBeenCalledWith(
      '/company/preregistration/origins/:locationId',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.post).toHaveBeenCalledWith(
      '/company/preregistration/destinations',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.patch).toHaveBeenCalledWith(
      '/company/preregistration/destinations/:locationId',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.delete).toHaveBeenCalledWith(
      '/company/preregistration/destinations/:locationId',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.post).toHaveBeenCalledWith(
      '/company/preregistration/items',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.patch).toHaveBeenCalledWith(
      '/company/preregistration/items/:itemId',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
    expect(routerMock.delete).toHaveBeenCalledWith(
      '/company/preregistration/items/:itemId',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
  });

  it('registers POST /:bookingId/quote endpoint', () => {
    createRoutes();

    expect(routerMock.post).toHaveBeenCalledWith(
      '/:bookingId/quote',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
  });

  it('registers POST /:bookingId/pay endpoint', () => {
    createRoutes();

    expect(routerMock.post).toHaveBeenCalledWith(
      '/:bookingId/pay',
      'requireRoleMiddleware:client_company',
      expect.any(Function)
    );
  });

  it('registers PATCH /:bookingId/manual-classification endpoint', () => {
    createRoutes();

    expect(routerMock.patch).toHaveBeenCalledWith(
      '/:bookingId/manual-classification',
      'requireRoleMiddleware:operator',
      expect.any(Function)
    );
  });

  it('registers GET /manual-classification/next endpoint', () => {
    createRoutes();

    expect(routerMock.get).toHaveBeenCalledWith(
      '/manual-classification/next',
      'requireRoleMiddleware:operator',
      expect.any(Function)
    );
  });

  it('registers POST /:bookingId/manual-classification/reject endpoint', () => {
    createRoutes();

    expect(routerMock.post).toHaveBeenCalledWith(
      '/:bookingId/manual-classification/reject',
      'requireRoleMiddleware:operator',
      expect.any(Function)
    );
  });
});
