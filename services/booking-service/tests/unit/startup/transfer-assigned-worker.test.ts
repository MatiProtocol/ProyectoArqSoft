describe('transfer-assigned-worker entrypoint', () => {
  let close: jest.Mock;
  let on: jest.Mock;
  let connectMongo: jest.Mock;
  let BookingWriteRepository: jest.Mock;
  let RecordAssignedResourcesHandler: jest.Mock;
  let createTransferAssignedWorker: jest.Mock;
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
    BookingWriteRepository = jest.fn();
    RecordAssignedResourcesHandler = jest.fn();
    createTransferAssignedWorker = jest.fn(() => ({
      close,
      on,
    }));
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../../src/infrastructure/config/database', () => ({
      connectMongo,
    }));
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/booking.write.repository',
      () => ({
        BookingWriteRepository,
      })
    );
    jest.doMock(
      '../../../src/application/commands/record-assigned-resources/record-assigned-resources.handler',
      () => ({
        RecordAssignedResourcesHandler,
      })
    );
    jest.doMock('../../../src/infrastructure/queues/transfer-assigned.worker', () => ({
      createTransferAssignedWorker,
    }));
    jest.doMock('@move/logs-lib', () => ({
      logger,
    }));
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

  it('connects to MongoDB and creates the transfer assigned worker', async () => {
    require('../../../src/transfer-assigned-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(connectMongo).toHaveBeenCalledTimes(1);
    expect(BookingWriteRepository).toHaveBeenCalledTimes(1);
    expect(RecordAssignedResourcesHandler).toHaveBeenCalledWith(
      BookingWriteRepository.mock.instances[0]
    );
    expect(createTransferAssignedWorker).toHaveBeenCalledWith(
      RecordAssignedResourcesHandler.mock.instances[0]
    );
    expect(on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith('booking-transfer-assigned-worker ready');
  });

  it('closes the worker on SIGTERM', async () => {
    require('../../../src/transfer-assigned-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('booking-transfer-assigned-worker stopped');
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('logs job failures emitted by the worker', async () => {
    require('../../../src/transfer-assigned-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    const failedHandler = on.mock.calls.find(([event]) => event === 'failed')?.[1];
    failedHandler(
      { id: 'job-1', data: { bookingId: 'booking-id', transferId: 42 } },
      new Error('Booking not found')
    );

    expect(logger.warn).toHaveBeenCalledWith('booking-transfer-assigned-worker job failed', {
      jobId: 'job-1',
      bookingId: 'booking-id',
      transferId: 42,
      error: 'Booking not found',
    });
  });

  it('exits with code 1 and logs the failure when closing the worker throws', async () => {
    close.mockRejectedValueOnce(new Error('close failed'));
    require('../../../src/transfer-assigned-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('booking-transfer-assigned-worker shutdown failed', {
      error: 'close failed',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
