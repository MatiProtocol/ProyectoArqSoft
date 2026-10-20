import type { NextFunction, Request, Response } from 'express';

describe('tracking-service app.ts', () => {
  let mockApp: {
    get: jest.Mock;
    use: jest.Mock;
  };
  let getMock: jest.Mock;
  let useMock: jest.Mock;
  let UserAuthReadRepository: jest.Mock;
  let GetRolesUserHandler: jest.Mock;
  let TransferReadRepository: jest.Mock;
  let TransferWriteRepository: jest.Mock;
  let BookingReadRepository: jest.Mock;
  let VehicleReadRepository: jest.Mock;
  let GpsReadingReadRepository: jest.Mock;
  let RegisteredDeviceCache: jest.Mock;
  let BullMqGpsIngestPublisher: jest.Mock;
  let BullMqTransferAssignedPublisher: jest.Mock;
  let AssignTransferHandler: jest.Mock;
  let StartTransferHandler: jest.Mock;
  let FinishTransferHandler: jest.Mock;
  let IngestGpsReadingHandler: jest.Mock;
  let ListActiveTransfersHandler: jest.Mock;
  let GetTransferPositionsHandler: jest.Mock;
  let TransferController: jest.Mock;
  let GpsController: jest.Mock;
  let createTrackingRoutesMock: jest.Mock;
  let getDeviceAuthConfig: jest.Mock;
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
    TransferReadRepository = jest.fn();
    TransferWriteRepository = jest.fn();
    BookingReadRepository = jest.fn();
    VehicleReadRepository = jest.fn();
    GpsReadingReadRepository = jest.fn();
    RegisteredDeviceCache = jest.fn();
    BullMqGpsIngestPublisher = jest.fn();
    BullMqTransferAssignedPublisher = jest.fn();
    AssignTransferHandler = jest.fn();
    StartTransferHandler = jest.fn();
    FinishTransferHandler = jest.fn();
    IngestGpsReadingHandler = jest.fn();
    ListActiveTransfersHandler = jest.fn();
    GetTransferPositionsHandler = jest.fn();
    TransferController = jest.fn();
    GpsController = jest.fn();
    createTrackingRoutesMock = jest.fn(() => 'tracking-router');
    getDeviceAuthConfig = jest.fn(() => ({ secret: 'device-secret' }));
    errorHandlerMock = jest.fn();
    createErrorHandlerMock = jest.fn(() => errorHandlerMock);
    envConfigFromProcessMock = jest.fn(() => ({ env: 'test', isDevelopment: false }));
    requestLoggerMock = jest.fn();
    metricsHandlerMock = jest.fn();

    jest.doMock('express-async-errors', () => ({}));
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
      requestLogger: requestLoggerMock,
      metricsHandler: metricsHandlerMock,
    }));
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/transfer.read.repository',
      () => ({ TransferReadRepository })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/transfer.write.repository',
      () => ({ TransferWriteRepository })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/booking.read.repository',
      () => ({ BookingReadRepository })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/vehicle.read.repository',
      () => ({ VehicleReadRepository })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/gps-reading.read.repository',
      () => ({ GpsReadingReadRepository })
    );
    jest.doMock('../../../src/infrastructure/cache/registered-devices.cache', () => ({
      RegisteredDeviceCache,
    }));
    jest.doMock('../../../src/infrastructure/queues/bullmq-gps-ingest.publisher', () => ({
      BullMqGpsIngestPublisher,
    }));
    jest.doMock('../../../src/infrastructure/queues/bullmq-transfer-assigned.publisher', () => ({
      BullMqTransferAssignedPublisher,
    }));
    jest.doMock(
      '../../../src/application/commands/assign-transfer/assign-transfer.handler',
      () => ({
        AssignTransferHandler,
      })
    );
    jest.doMock('../../../src/application/commands/start-transfer/start-transfer.handler', () => ({
      StartTransferHandler,
    }));
    jest.doMock(
      '../../../src/application/commands/finish-transfer/finish-transfer.handler',
      () => ({
        FinishTransferHandler,
      })
    );
    jest.doMock(
      '../../../src/application/commands/ingest-gps-reading/ingest-gps-reading.handler',
      () => ({ IngestGpsReadingHandler })
    );
    jest.doMock(
      '../../../src/application/queries/list-active-transfers/list-active-transfers.handler',
      () => ({ ListActiveTransfersHandler })
    );
    jest.doMock(
      '../../../src/application/queries/get-transfer-positions/get-transfer-positions.handler',
      () => ({ GetTransferPositionsHandler })
    );
    jest.doMock('../../../src/presentation/controllers/transfer.controller', () => ({
      TransferController,
    }));
    jest.doMock('../../../src/presentation/controllers/gps.controller', () => ({
      GpsController,
    }));
    jest.doMock('../../../src/infrastructure/config/device-auth', () => ({
      getDeviceAuthConfig,
    }));
    jest.doMock('../../../src/presentation/routes/tracking.routes', () => ({
      createTrackingRoutes: createTrackingRoutesMock,
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

  it('health endpoint returns 200', () => {
    require('../../../src/app');

    const healthHandler = getMock.mock.calls.find(([path]: [string]) => path === '/health')[1];
    const res = { sendStatus: jest.fn() };

    healthHandler({}, res);

    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });

  it('root endpoint returns ok', () => {
    require('../../../src/app');

    const rootHandler = getMock.mock.calls.find(([path]: [string]) => path === '/')[1];
    const res = { send: jest.fn() };

    rootHandler({}, res);

    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('registers tracking routes and error middleware in setupRoutes', () => {
    const { setupRoutes } = require('../../../src/app');
    const db = {};

    setupRoutes(db);

    expect(UserAuthReadRepository).toHaveBeenCalledWith(db);
    expect(GetRolesUserHandler).toHaveBeenCalledWith(UserAuthReadRepository.mock.instances[0]);
    expect(TransferReadRepository).toHaveBeenCalledTimes(1);
    expect(TransferWriteRepository).toHaveBeenCalledTimes(1);
    expect(BookingReadRepository).toHaveBeenCalledTimes(1);
    expect(VehicleReadRepository).toHaveBeenCalledTimes(1);
    expect(GpsReadingReadRepository).toHaveBeenCalledTimes(1);
    expect(RegisteredDeviceCache).toHaveBeenCalledTimes(1);
    expect(BullMqGpsIngestPublisher).toHaveBeenCalledTimes(1);
    expect(BullMqTransferAssignedPublisher).toHaveBeenCalledTimes(1);
    expect(AssignTransferHandler).toHaveBeenCalledWith(
      BookingReadRepository.mock.instances[0],
      VehicleReadRepository.mock.instances[0],
      TransferReadRepository.mock.instances[0],
      TransferWriteRepository.mock.instances[0],
      BullMqTransferAssignedPublisher.mock.instances[0]
    );
    expect(StartTransferHandler).toHaveBeenCalledWith(
      TransferReadRepository.mock.instances[0],
      TransferWriteRepository.mock.instances[0]
    );
    expect(FinishTransferHandler).toHaveBeenCalledWith(
      TransferReadRepository.mock.instances[0],
      TransferWriteRepository.mock.instances[0]
    );
    expect(IngestGpsReadingHandler).toHaveBeenCalledWith(
      RegisteredDeviceCache.mock.instances[0],
      BullMqGpsIngestPublisher.mock.instances[0]
    );
    expect(ListActiveTransfersHandler).toHaveBeenCalledWith(
      TransferReadRepository.mock.instances[0]
    );
    expect(GetTransferPositionsHandler).toHaveBeenCalledWith(
      GpsReadingReadRepository.mock.instances[0]
    );
    expect(TransferController).toHaveBeenCalledWith(
      AssignTransferHandler.mock.instances[0],
      StartTransferHandler.mock.instances[0],
      FinishTransferHandler.mock.instances[0],
      ListActiveTransfersHandler.mock.instances[0],
      GetTransferPositionsHandler.mock.instances[0]
    );
    expect(GpsController).toHaveBeenCalledWith(IngestGpsReadingHandler.mock.instances[0]);
    expect(getDeviceAuthConfig).toHaveBeenCalledTimes(1);
    expect(createTrackingRoutesMock).toHaveBeenCalledWith({
      getRolesHandler: GetRolesUserHandler.mock.instances[0],
      gpsController: GpsController.mock.instances[0],
      transferController: TransferController.mock.instances[0],
      deviceAuthConfig: getDeviceAuthConfig.mock.results[0].value,
    });
    expect(useMock).toHaveBeenCalledWith('/api/v1/tracking', 'tracking-router');
    expect(envConfigFromProcessMock).toHaveBeenCalledTimes(1);
    expect(createErrorHandlerMock).toHaveBeenCalledWith(
      envConfigFromProcessMock.mock.results[0].value
    );
    expect(useMock).toHaveBeenCalledWith(errorHandlerMock);
  });
});
