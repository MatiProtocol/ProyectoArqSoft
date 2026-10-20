import type { NextFunction, Request, Response } from 'express';

describe('booking-service app.ts', () => {
  let mockApp: {
    get: jest.Mock;
    use: jest.Mock;
  };
  let getMock: jest.Mock;
  let useMock: jest.Mock;
  let UserAuthReadRepository: jest.Mock;
  let GetRolesUserHandler: jest.Mock;
  let BookingReadRepository: jest.Mock;
  let BookingWriteRepository: jest.Mock;
  let GeminiItemClassifier: jest.Mock;
  let BullMqPendingClassificationPublisher: jest.Mock;
  let BullMqCustomerEmailPublisher: jest.Mock;
  let BullMqPaymentRetryPublisher: jest.Mock;
  let BullMqManualClassificationQueue: jest.Mock;
  let MongoRedisFrequentCompanyClientProvider: jest.Mock;
  let CachedTopCompanyPreregistrationReadRepository: jest.Mock;
  let CreateBookingHandler: jest.Mock;
  let CreateCompanyBookingHandler: jest.Mock;
  let ManageCompanyPreregistrationHandler: jest.Mock;
  let ClaimManualClassificationHandler: jest.Mock;
  let ManualClassifyBookingHandler: jest.Mock;
  let RejectManualClassificationHandler: jest.Mock;
  let GetCompanyPreregistrationHandler: jest.Mock;
  let ListCustomerBookingsHandler: jest.Mock;
  let CreateBookingController: jest.Mock;
  let CreateCompanyBookingController: jest.Mock;
  let ListCustomerBookingsController: jest.Mock;
  let CompanyPreregistrationController: jest.Mock;
  let ManualClassifyBookingController: jest.Mock;
  let CompanyPreregistrationReadRepository: jest.Mock;
  let CompanyPreregistrationWriteRepository: jest.Mock;
  let HttpCategoryCatalogClient: jest.Mock;
  let HttpIdentityUserClient: jest.Mock;
  let getCategoryCatalogConfig: jest.Mock;
  let getIdentityServiceConfig: jest.Mock;
  let getGeminiConfig: jest.Mock;
  let getBookingHealth: jest.Mock;
  let createBookingRoutesMock: jest.Mock;
  let createErrorHandlerMock: jest.Mock;
  let envConfigFromProcessMock: jest.Mock;
  let errorHandlerMock: jest.Mock;
  let requestLoggerMock: jest.Mock;
  let metricsHandlerMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    getMock = jest.fn();
    useMock = jest.fn();
    mockApp = {
      get: getMock,
      use: useMock,
    };

    const expressMock = jest.fn(() => mockApp);
    const jsonMiddlewareMock = jest.fn(
      () => (_req: Request, _res: Response, next: NextFunction) => next()
    );
    const expressModuleMock = Object.assign(expressMock, { json: jsonMiddlewareMock });

    UserAuthReadRepository = jest.fn();
    GetRolesUserHandler = jest.fn();
    BookingReadRepository = jest.fn();
    BookingWriteRepository = jest.fn();
    GeminiItemClassifier = jest.fn();
    BullMqPendingClassificationPublisher = jest.fn();
    BullMqCustomerEmailPublisher = jest.fn();
    BullMqPaymentRetryPublisher = jest.fn();
    BullMqManualClassificationQueue = jest.fn();
    MongoRedisFrequentCompanyClientProvider = jest.fn();
    CachedTopCompanyPreregistrationReadRepository = jest.fn();
    CreateBookingHandler = jest.fn();
    CreateCompanyBookingHandler = jest.fn();
    ManageCompanyPreregistrationHandler = jest.fn();
    ClaimManualClassificationHandler = jest.fn();
    ManualClassifyBookingHandler = jest.fn();
    RejectManualClassificationHandler = jest.fn();
    GetCompanyPreregistrationHandler = jest.fn();
    ListCustomerBookingsHandler = jest.fn();
    CreateBookingController = jest.fn();
    CreateCompanyBookingController = jest.fn();
    ListCustomerBookingsController = jest.fn();
    CompanyPreregistrationController = jest.fn();
    ManualClassifyBookingController = jest.fn();
    CompanyPreregistrationReadRepository = jest.fn();
    CompanyPreregistrationWriteRepository = jest.fn();
    HttpCategoryCatalogClient = jest.fn();
    HttpIdentityUserClient = jest.fn();
    getCategoryCatalogConfig = jest.fn(() => ({
      baseUrl: 'http://configuration-service:4003',
      internalToken: 'internal-token',
      timeoutMs: 5000,
    }));
    getIdentityServiceConfig = jest.fn(() => ({
      baseUrl: 'http://identity-service:4001',
      internalToken: 'identity-token',
      timeoutMs: 5000,
    }));
    getGeminiConfig = jest.fn(() => ({
      apiKey: 'key',
      model: 'model',
      classificationPrompt: 'prompt',
    }));
    getBookingHealth = jest.fn().mockResolvedValue({
      service: 'booking-service',
      status: 'ok',
      circuits: {},
    });
    createBookingRoutesMock = jest.fn(() => 'booking-router');
    errorHandlerMock = jest.fn();
    createErrorHandlerMock = jest.fn(() => errorHandlerMock);
    envConfigFromProcessMock = jest.fn(() => ({ env: 'test', isDevelopment: false }));
    requestLoggerMock = jest.fn();
    metricsHandlerMock = jest.fn();

    jest.doMock('express', () => ({
      __esModule: true,
      default: expressModuleMock,
      json: jsonMiddlewareMock,
    }));
    jest.doMock('@move/auth-lib', () => ({
      UserAuthReadRepository,
      GetRolesUserHandler,
    }));
    jest.doMock('@move/errors-lib', () => ({
      createErrorHandler: createErrorHandlerMock,
      envConfigFromProcess: envConfigFromProcessMock,
    }));
    jest.doMock('@move/logs-lib', () => ({
      incrementBusinessEvent: jest.fn(),
      requestLogger: requestLoggerMock,
      metricsHandler: metricsHandlerMock,
    }));
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/booking.read.repository',
      () => ({
        BookingReadRepository,
      })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/booking.write.repository',
      () => ({
        BookingWriteRepository,
      })
    );
    jest.doMock('../../../src/infrastructure/classification/gemini-item-classifier', () => ({
      GeminiItemClassifier,
    }));
    jest.doMock(
      '../../../src/infrastructure/queues/bullmq-pending-classification.publisher',
      () => ({
        BullMqPendingClassificationPublisher,
      })
    );
    jest.doMock('../../../src/infrastructure/queues/bullmq-customer-email.publisher', () => ({
      BullMqCustomerEmailPublisher,
    }));
    jest.doMock('../../../src/infrastructure/queues/bullmq-payment-retry.publisher', () => ({
      BullMqPaymentRetryPublisher,
    }));
    jest.doMock('../../../src/infrastructure/queues/bullmq-manual-classification.queue', () => ({
      BullMqManualClassificationQueue,
    }));
    jest.doMock(
      '../../../src/infrastructure/providers/mongo-redis-frequent-company-client.provider',
      () => ({
        MongoRedisFrequentCompanyClientProvider,
      })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/cached-top-company-preregistration.read.repository',
      () => ({
        CachedTopCompanyPreregistrationReadRepository,
      })
    );
    jest.doMock(
      '../../../src/application/commands/claim-manual-classification/claim-manual-classification.handler',
      () => ({
        ClaimManualClassificationHandler,
      })
    );
    jest.doMock('../../../src/application/commands/create-booking/create-booking.handler', () => ({
      CreateBookingHandler,
    }));
    jest.doMock(
      '../../../src/application/commands/create-company-booking/create-company-booking.handler',
      () => ({
        CreateCompanyBookingHandler,
      })
    );
    jest.doMock(
      '../../../src/application/commands/manage-company-preregistration/manage-company-preregistration.handler',
      () => ({
        ManageCompanyPreregistrationHandler,
      })
    );
    jest.doMock(
      '../../../src/application/commands/manual-classify-booking/manual-classify-booking.handler',
      () => ({
        ManualClassifyBookingHandler,
      })
    );
    jest.doMock(
      '../../../src/application/commands/reject-manual-classification/reject-manual-classification.handler',
      () => ({
        RejectManualClassificationHandler,
      })
    );
    jest.doMock(
      '../../../src/application/queries/get-company-preregistration/get-company-preregistration.handler',
      () => ({
        GetCompanyPreregistrationHandler,
      })
    );
    jest.doMock(
      '../../../src/application/queries/list-customer-bookings/list-customer-bookings.handler',
      () => ({
        ListCustomerBookingsHandler,
      })
    );
    jest.doMock('../../../src/presentation/controllers/create-booking.controller', () => ({
      CreateBookingController,
    }));
    jest.doMock('../../../src/presentation/controllers/list-customer-bookings.controller', () => ({
      ListCustomerBookingsController,
    }));
    jest.doMock('../../../src/presentation/controllers/create-company-booking.controller', () => ({
      CreateCompanyBookingController,
    }));
    jest.doMock('../../../src/presentation/controllers/company-preregistration.controller', () => ({
      CompanyPreregistrationController,
    }));
    jest.doMock('../../../src/presentation/controllers/manual-classify-booking.controller', () => ({
      ManualClassifyBookingController,
    }));
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/company-preregistration.read.repository',
      () => ({
        CompanyPreregistrationReadRepository,
      })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/company-preregistration.write.repository',
      () => ({
        CompanyPreregistrationWriteRepository,
      })
    );
    jest.doMock('../../../src/infrastructure/config/category-catalog', () => ({
      getCategoryCatalogConfig,
    }));
    jest.doMock('../../../src/infrastructure/config/identity-service', () => ({
      getIdentityServiceConfig,
    }));
    jest.doMock('../../../src/infrastructure/clients/category-catalog.client', () => ({
      HttpCategoryCatalogClient,
    }));
    jest.doMock('../../../src/infrastructure/clients/identity-user.client', () => ({
      HttpIdentityUserClient,
    }));
    jest.doMock('../../../src/infrastructure/config/gemini', () => ({
      getGeminiConfig,
    }));
    jest.doMock('../../../src/infrastructure/health/booking-health', () => ({
      getBookingHealth,
    }));
    jest.doMock('../../../src/presentation/routes/booking.routes', () => ({
      createBookingRoutes: createBookingRoutesMock,
    }));
  });

  it('registers GET /health endpoint', () => {
    require('../../../src/app');

    expect(getMock).toHaveBeenCalledWith('/health', expect.any(Function));
  });

  it('registers request logger and metrics endpoint', () => {
    require('../../../src/app');

    expect(useMock).toHaveBeenCalledWith(requestLoggerMock);
    expect(getMock).toHaveBeenCalledWith('/metrics', metricsHandlerMock);
  });

  it('health endpoint returns booking health as JSON', async () => {
    require('../../../src/app');

    const healthHandler = getMock.mock.calls.find(([path]: [string]) => path === '/health')[1];
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await healthHandler({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      service: 'booking-service',
      status: 'ok',
      circuits: {},
    });
  });

  it('root endpoint returns ok', () => {
    require('../../../src/app');

    const rootHandler = getMock.mock.calls.find(([path]: [string]) => path === '/')[1];
    const res = { send: jest.fn() };

    rootHandler({}, res);

    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('registers booking routes and error middleware in setupRoutes', () => {
    const { setupRoutes } = require('../../../src/app');
    const db = {};

    setupRoutes(db);

    expect(UserAuthReadRepository).toHaveBeenCalledWith(db);
    expect(GetRolesUserHandler).toHaveBeenCalledWith(UserAuthReadRepository.mock.instances[0]);
    expect(BookingReadRepository).toHaveBeenCalledTimes(1);
    expect(BookingWriteRepository).toHaveBeenCalledTimes(1);
    expect(CompanyPreregistrationReadRepository).toHaveBeenCalledTimes(1);
    expect(CachedTopCompanyPreregistrationReadRepository).toHaveBeenCalledWith(
      CompanyPreregistrationReadRepository.mock.instances[0]
    );
    expect(CompanyPreregistrationWriteRepository).toHaveBeenCalledTimes(1);
    expect(getCategoryCatalogConfig).toHaveBeenCalledTimes(1);
    expect(HttpCategoryCatalogClient).toHaveBeenCalledWith(
      getCategoryCatalogConfig.mock.results[0].value
    );
    expect(getIdentityServiceConfig).toHaveBeenCalledTimes(1);
    expect(HttpIdentityUserClient).toHaveBeenCalledWith(
      getIdentityServiceConfig.mock.results[0].value
    );
    expect(getGeminiConfig).toHaveBeenCalledTimes(1);
    expect(GeminiItemClassifier).toHaveBeenCalledWith(
      getGeminiConfig.mock.results[0].value,
      HttpCategoryCatalogClient.mock.instances[0]
    );
    expect(BullMqPendingClassificationPublisher).toHaveBeenCalledTimes(1);
    expect(BullMqCustomerEmailPublisher).toHaveBeenCalledTimes(1);
    expect(BullMqManualClassificationQueue).toHaveBeenCalledTimes(1);
    expect(MongoRedisFrequentCompanyClientProvider).toHaveBeenCalledTimes(1);
    expect(CreateBookingHandler).toHaveBeenCalledWith(
      BookingWriteRepository.mock.instances[0],
      GeminiItemClassifier.mock.instances[0],
      BullMqPendingClassificationPublisher.mock.instances[0]
    );
    expect(CreateCompanyBookingHandler).toHaveBeenCalledWith(
      BookingWriteRepository.mock.instances[0],
      CompanyPreregistrationReadRepository.mock.instances[0],
      MongoRedisFrequentCompanyClientProvider.mock.instances[0],
      CachedTopCompanyPreregistrationReadRepository.mock.instances[0]
    );
    expect(GetCompanyPreregistrationHandler).toHaveBeenCalledWith(
      CompanyPreregistrationReadRepository.mock.instances[0]
    );
    expect(ListCustomerBookingsHandler).toHaveBeenCalledWith(
      BookingReadRepository.mock.instances[0]
    );
    expect(ManageCompanyPreregistrationHandler).toHaveBeenCalledWith(
      CompanyPreregistrationWriteRepository.mock.instances[0],
      HttpCategoryCatalogClient.mock.instances[0]
    );
    expect(ManualClassifyBookingHandler).toHaveBeenCalledWith(
      BookingWriteRepository.mock.instances[0],
      HttpCategoryCatalogClient.mock.instances[0],
      BullMqManualClassificationQueue.mock.instances[0]
    );
    expect(ClaimManualClassificationHandler).toHaveBeenCalledWith(
      BullMqManualClassificationQueue.mock.instances[0]
    );
    expect(RejectManualClassificationHandler).toHaveBeenCalledWith(
      BookingWriteRepository.mock.instances[0],
      BullMqManualClassificationQueue.mock.instances[0],
      HttpIdentityUserClient.mock.instances[0],
      BullMqCustomerEmailPublisher.mock.instances[0]
    );
    expect(CreateBookingController).toHaveBeenCalledWith(CreateBookingHandler.mock.instances[0]);
    expect(ListCustomerBookingsController).toHaveBeenCalledWith(
      ListCustomerBookingsHandler.mock.instances[0]
    );
    expect(CreateCompanyBookingController).toHaveBeenCalledWith(
      CreateCompanyBookingHandler.mock.instances[0]
    );
    expect(CompanyPreregistrationController).toHaveBeenCalledWith(
      ManageCompanyPreregistrationHandler.mock.instances[0],
      GetCompanyPreregistrationHandler.mock.instances[0]
    );
    expect(ManualClassifyBookingController).toHaveBeenCalledWith(
      ManualClassifyBookingHandler.mock.instances[0],
      ClaimManualClassificationHandler.mock.instances[0],
      RejectManualClassificationHandler.mock.instances[0]
    );
    expect(createBookingRoutesMock).toHaveBeenCalledWith({
      getRolesHandler: GetRolesUserHandler.mock.instances[0],
      createBookingController: CreateBookingController.mock.instances[0],
      createCompanyBookingController: CreateCompanyBookingController.mock.instances[0],
      listCustomerBookingsController: ListCustomerBookingsController.mock.instances[0],
      companyPreregistrationController: CompanyPreregistrationController.mock.instances[0],
      manualClassifyBookingController: ManualClassifyBookingController.mock.instances[0],
      quoteBookingController: expect.any(Object),
      payBookingController: expect.any(Object),
    });
    expect(useMock).toHaveBeenCalledWith('/api/v1/bookings', 'booking-router');
    expect(envConfigFromProcessMock).toHaveBeenCalledTimes(1);
    expect(createErrorHandlerMock).toHaveBeenCalledWith(
      envConfigFromProcessMock.mock.results[0].value
    );
    expect(useMock).toHaveBeenCalledWith(errorHandlerMock);
  });
});
