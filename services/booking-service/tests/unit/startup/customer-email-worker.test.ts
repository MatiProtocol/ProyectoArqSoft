describe('customer-email-worker entrypoint', () => {
  let close: jest.Mock;
  let on: jest.Mock;
  let getGmailConfig: jest.Mock;
  let GmailCustomerEmailNotifier: jest.Mock;
  let createCustomerEmailWorker: jest.Mock;
  let BullMqOperatorNotificationPublisher: jest.Mock;
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
    getGmailConfig = jest.fn(() => ({
      user: 'move@example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      timeoutMs: 10000,
    }));
    GmailCustomerEmailNotifier = jest.fn();
    BullMqOperatorNotificationPublisher = jest.fn();
    createCustomerEmailWorker = jest.fn(() => ({
      close,
      on,
    }));
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../../src/infrastructure/config/gmail', () => ({
      getGmailConfig,
    }));
    jest.doMock('../../../src/infrastructure/notifications/gmail-customer-email-notifier', () => ({
      GmailCustomerEmailNotifier,
    }));
    jest.doMock('../../../src/infrastructure/queues/customer-email.worker', () => ({
      createCustomerEmailWorker,
    }));
    jest.doMock(
      '../../../src/infrastructure/queues/bullmq-operator-notification.publisher',
      () => ({
        BullMqOperatorNotificationPublisher,
      })
    );
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

  it('creates the customer email worker with Gmail notifier', () => {
    require('../../../src/customer-email-worker');

    expect(getGmailConfig).toHaveBeenCalledTimes(1);
    expect(GmailCustomerEmailNotifier).toHaveBeenCalledWith(getGmailConfig.mock.results[0].value);
    expect(createCustomerEmailWorker).toHaveBeenCalledWith(
      GmailCustomerEmailNotifier.mock.instances[0],
      BullMqOperatorNotificationPublisher.mock.instances[0]
    );
    expect(on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith('booking-customer-email-worker ready');
  });

  it('closes the worker on SIGTERM', async () => {
    require('../../../src/customer-email-worker');

    process.emit('SIGTERM');
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('booking-customer-email-worker stopped');
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});
