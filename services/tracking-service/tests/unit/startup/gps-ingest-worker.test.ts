describe('gps-ingest-worker entrypoint', () => {
  let close: jest.Mock;
  let on: jest.Mock;
  let connectMongo: jest.Mock;
  let RecordGpsReadingHandler: jest.Mock;
  let GpsReadingWriteRepository: jest.Mock;
  let TransferWriteRepository: jest.Mock;
  let BullMqAlertDetectionPublisher: jest.Mock;
  let createGpsIngestWorker: jest.Mock;
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
    RecordGpsReadingHandler = jest.fn();
    GpsReadingWriteRepository = jest.fn();
    TransferWriteRepository = jest.fn();
    BullMqAlertDetectionPublisher = jest.fn();
    createGpsIngestWorker = jest.fn(() => ({ close, on }));
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../../src/infrastructure/config/database', () => ({ connectMongo }));
    jest.doMock(
      '../../../src/application/commands/record-gps-reading/record-gps-reading.handler',
      () => ({ RecordGpsReadingHandler })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/gps-reading.write.repository',
      () => ({ GpsReadingWriteRepository })
    );
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/transfer.write.repository',
      () => ({ TransferWriteRepository })
    );
    jest.doMock('../../../src/infrastructure/queues/bullmq-alert-detection.publisher', () => ({
      BullMqAlertDetectionPublisher,
    }));
    jest.doMock('../../../src/infrastructure/queues/gps-ingest.worker', () => ({
      createGpsIngestWorker,
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
    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);

    expect(connectMongo).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('tracking-gps-worker MongoDB connected');
    expect(RecordGpsReadingHandler).toHaveBeenCalledWith(
      GpsReadingWriteRepository.mock.instances[0],
      TransferWriteRepository.mock.instances[0],
      BullMqAlertDetectionPublisher.mock.instances[0]
    );
    expect(createGpsIngestWorker).toHaveBeenCalledWith(RecordGpsReadingHandler.mock.instances[0]);
    expect(on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith('tracking-gps-worker ready');
  });

  it('logs a warning when a job fails', async () => {
    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);

    const failedListener = on.mock.calls.find(([event]) => event === 'failed')[1];
    failedListener({ id: 'job-1', data: { transferId: 7 } }, new Error('boom'));

    expect(logger.warn).toHaveBeenCalledWith('tracking-gps-worker job failed', {
      jobId: 'job-1',
      transferId: 7,
      error: 'boom',
    });
  });

  it('logs an error when the worker emits one', async () => {
    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);

    const errorListener = on.mock.calls.find(([event]) => event === 'error')[1];
    errorListener(new Error('connection lost'));

    expect(logger.error).toHaveBeenCalledWith('tracking-gps-worker error', {
      error: 'connection lost',
    });
  });

  it('closes the worker on SIGTERM', async () => {
    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('tracking-gps-worker stopped');
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('closes the worker on SIGINT', async () => {
    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);

    process.emit('SIGINT');
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('exits with code 1 when shutdown fails', async () => {
    close.mockRejectedValueOnce(new Error('close failed'));
    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-gps-worker shutdown failed', {
      error: 'close failed',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when bootstrap fails', async () => {
    connectMongo.mockRejectedValueOnce(new Error('mongo down'));

    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-gps-worker failed to start', {
      error: 'mongo down',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when shutdown fails with a non-Error value', async () => {
    close.mockRejectedValueOnce('close exploded');
    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-gps-worker shutdown failed', {
      error: 'close exploded',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when bootstrap fails with a non-Error value', async () => {
    connectMongo.mockRejectedValueOnce('mongo exploded');

    require('../../../src/gps-ingest-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-gps-worker failed to start', {
      error: 'mongo exploded',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
