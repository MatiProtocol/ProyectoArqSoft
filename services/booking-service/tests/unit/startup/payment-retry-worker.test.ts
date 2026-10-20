describe('payment-retry-worker entrypoint', () => {
  let close: jest.Mock;
  let on: jest.Mock;
  let connectMongo: jest.Mock;
  let getPaymentConfig: jest.Mock;
  let createExternalServiceCircuitBreaker: jest.Mock;
  let SimulatedPaymentGateway: jest.Mock;
  let BullMqPaymentRetryPublisher: jest.Mock;
  let BookingWriteRepository: jest.Mock;
  let createPaymentRetryWorker: jest.Mock;
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
    getPaymentConfig = jest.fn(() => ({
      provider: 'stripe-sim',
      timeoutMs: 3000,
      defaultOutcome: 'accepted',
    }));
    createExternalServiceCircuitBreaker = jest.fn(() => ({ fire: jest.fn() }));
    SimulatedPaymentGateway = jest.fn().mockImplementation(() => ({
      charge: jest.fn(),
    }));
    BullMqPaymentRetryPublisher = jest.fn();
    BookingWriteRepository = jest.fn();
    createPaymentRetryWorker = jest.fn(() => ({
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
    jest.doMock('../../../src/infrastructure/config/payment', () => ({
      getPaymentConfig,
    }));
    jest.doMock(
      '../../../src/infrastructure/circuit-breakers/external-service-circuit-breaker',
      () => ({
        createExternalServiceCircuitBreaker,
      })
    );
    jest.doMock('../../../src/infrastructure/clients/simulated-payment.gateway', () => ({
      SimulatedPaymentGateway,
    }));
    jest.doMock('../../../src/infrastructure/queues/bullmq-payment-retry.publisher', () => ({
      BullMqPaymentRetryPublisher,
    }));
    jest.doMock(
      '../../../src/infrastructure/repositories/implementations/booking.write.repository',
      () => ({
        BookingWriteRepository,
      })
    );
    jest.doMock('../../../src/infrastructure/queues/payment-retry.worker', () => ({
      createPaymentRetryWorker,
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

  it('connects to MongoDB and creates the payment retry worker', async () => {
    require('../../../src/payment-retry-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(connectMongo).toHaveBeenCalledTimes(1);
    expect(getPaymentConfig).toHaveBeenCalledTimes(1);
    expect(SimulatedPaymentGateway).toHaveBeenCalledWith(getPaymentConfig.mock.results[0].value);
    expect(createExternalServiceCircuitBreaker).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ name: 'payment', serviceName: 'Payment gateway' })
    );
    expect(createPaymentRetryWorker).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith('booking-payment-retry-worker ready');
  });

  it('closes the worker on SIGTERM', async () => {
    require('../../../src/payment-retry-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('booking-payment-retry-worker stopped');
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('closes the worker on SIGINT', async () => {
    require('../../../src/payment-retry-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    process.emit('SIGINT');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('booking-payment-retry-worker stopped');
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('logs job failures emitted by the worker', async () => {
    require('../../../src/payment-retry-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    const failedHandler = on.mock.calls.find(([event]) => event === 'failed')?.[1];
    failedHandler(
      { id: 'job-1', data: { bookingId: 'booking-id', userId: 'user-id' } },
      new Error('Payment gateway is unavailable')
    );

    expect(logger.warn).toHaveBeenCalledWith('booking-payment-retry-worker job failed', {
      jobId: 'job-1',
      bookingId: 'booking-id',
      userId: 'user-id',
      error: 'Payment gateway is unavailable',
    });
  });

  it('logs worker errors emitted by the worker', async () => {
    require('../../../src/payment-retry-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    const errorHandler = on.mock.calls.find(([event]) => event === 'error')?.[1];
    errorHandler(new Error('Redis connection lost'));

    expect(logger.error).toHaveBeenCalledWith('booking-payment-retry-worker error', {
      error: 'Redis connection lost',
    });
  });

  it('exits with code 1 and logs the failure when closing the worker throws an Error', async () => {
    close.mockRejectedValueOnce(new Error('close failed'));
    require('../../../src/payment-retry-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('booking-payment-retry-worker shutdown failed', {
      error: 'close failed',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 and logs a stringified failure when closing the worker throws a non-Error value', async () => {
    close.mockRejectedValueOnce('close failed');
    require('../../../src/payment-retry-worker');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('booking-payment-retry-worker shutdown failed', {
      error: 'close failed',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
