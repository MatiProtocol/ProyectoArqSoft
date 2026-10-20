describe('alert-detection-worker entrypoint', () => {
  let close: jest.Mock;
  let on: jest.Mock;
  let connectMongo: jest.Mock;
  let getProlongedStopThresholds: jest.Mock;
  let DetectSituationsHandler: jest.Mock;
  let ZoneReadRepository: jest.Mock;
  let GpsReadingReadRepository: jest.Mock;
  let AlertWriteRepository: jest.Mock;
  let TransferWriteRepository: jest.Mock;
  let BullMqAlertNotificationPublisher: jest.Mock;
  let createAlertDetectionWorker: jest.Mock;
  let processExitSpy: jest.SpyInstance;
  let logger: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
  let initialSigintListeners: NodeJS.SignalsListener[];
  let initialSigtermListeners: NodeJS.SignalsListener[];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    initialSigintListeners = process.listeners('SIGINT') as NodeJS.SignalsListener[];
    initialSigtermListeners = process.listeners('SIGTERM') as NodeJS.SignalsListener[];

    close = jest.fn().mockResolvedValue(undefined);
    on = jest.fn();
    connectMongo = jest.fn().mockResolvedValue(undefined);
    getProlongedStopThresholds = jest.fn(() => ({
      radiusMeters: 30,
      windowMs: 120000,
      minReadings: 5,
    }));
    DetectSituationsHandler = jest.fn();
    ZoneReadRepository = jest.fn();
    GpsReadingReadRepository = jest.fn();
    AlertWriteRepository = jest.fn();
    TransferWriteRepository = jest.fn();
    BullMqAlertNotificationPublisher = jest.fn();
    createAlertDetectionWorker = jest.fn(() => ({ close, on }));
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../../src/infrastructure/config/database', () => ({ connectMongo }));
    jest.doMock('../../../src/infrastructure/config/alert-thresholds', () => ({
      getProlongedStopThresholds,
    }));
    jest.doMock(
      '../../../src/application/commands/detect-situations/detect-situations.handler',
      () => ({ DetectSituationsHandler })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/zone.read.repository',
      () => ({ ZoneReadRepository })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/gps-reading.read.repository',
      () => ({ GpsReadingReadRepository })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/alert.write.repository',
      () => ({ AlertWriteRepository })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/transfer.write.repository',
      () => ({ TransferWriteRepository })
    );
    jest.doMock('../../../src/infrastructure/queues/bullmq-alert-notification.publisher', () => ({
      BullMqAlertNotificationPublisher,
    }));
    jest.doMock('../../../src/infrastructure/queues/alert-detection.worker', () => ({
      createAlertDetectionWorker,
    }));
    jest.doMock('@move/logs-lib', () => ({ logger }));
  });

  afterEach(() => {
    process
      .listeners('SIGINT')
      .filter((listener) => !initialSigintListeners.includes(listener as NodeJS.SignalsListener))
      .forEach((listener) => {
        process.removeListener('SIGINT', listener);
      });
    process
      .listeners('SIGTERM')
      .filter((listener) => !initialSigtermListeners.includes(listener as NodeJS.SignalsListener))
      .forEach((listener) => {
        process.removeListener('SIGTERM', listener);
      });
    processExitSpy.mockRestore();
  });

  it('connects Mongo, wires the handler and creates the worker', async () => {
    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);

    expect(connectMongo).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('tracking-alert-worker MongoDB connected');
    expect(DetectSituationsHandler).toHaveBeenCalledWith(
      ZoneReadRepository.mock.instances[0],
      GpsReadingReadRepository.mock.instances[0],
      AlertWriteRepository.mock.instances[0],
      TransferWriteRepository.mock.instances[0],
      BullMqAlertNotificationPublisher.mock.instances[0],
      getProlongedStopThresholds.mock.results[0].value
    );
    expect(createAlertDetectionWorker).toHaveBeenCalledWith(
      DetectSituationsHandler.mock.instances[0]
    );
    expect(on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith('tracking-alert-worker ready');
  });

  it('logs a warning when a job fails', async () => {
    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);

    const failedListener = on.mock.calls.find(([event]) => event === 'failed')[1];
    failedListener({ id: 'job-1', data: { transferId: 42 } }, new Error('boom'));

    expect(logger.warn).toHaveBeenCalledWith('tracking-alert-worker job failed', {
      jobId: 'job-1',
      transferId: 42,
      error: 'boom',
    });
  });

  it('logs a warning when a job fails without job data', async () => {
    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);

    const failedListener = on.mock.calls.find(([event]) => event === 'failed')[1];
    failedListener(undefined, new Error('boom'));

    expect(logger.warn).toHaveBeenCalledWith('tracking-alert-worker job failed', {
      jobId: undefined,
      transferId: undefined,
      error: 'boom',
    });
  });

  it('logs an error when the worker emits one', async () => {
    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);

    const errorListener = on.mock.calls.find(([event]) => event === 'error')[1];
    errorListener(new Error('connection lost'));

    expect(logger.error).toHaveBeenCalledWith('tracking-alert-worker error', {
      error: 'connection lost',
    });
  });

  it('closes the worker on SIGTERM', async () => {
    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('tracking-alert-worker stopped');
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('closes the worker on SIGINT', async () => {
    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);

    process.emit('SIGINT');
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('exits with code 1 when shutdown fails', async () => {
    close.mockRejectedValueOnce(new Error('close failed'));
    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-alert-worker shutdown failed', {
      error: 'close failed',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when bootstrap fails', async () => {
    connectMongo.mockRejectedValueOnce(new Error('mongo down'));

    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-alert-worker failed to start', {
      error: 'mongo down',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when shutdown fails with a non-Error value', async () => {
    close.mockRejectedValueOnce('close exploded');
    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-alert-worker shutdown failed', {
      error: 'close exploded',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when bootstrap fails with a non-Error value', async () => {
    connectMongo.mockRejectedValueOnce('mongo exploded');

    require('../../../src/alert-detection-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-alert-worker failed to start', {
      error: 'mongo exploded',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
