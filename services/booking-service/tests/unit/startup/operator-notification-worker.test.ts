describe('operator-notification-worker entrypoint', () => {
  let close: jest.Mock;
  let on: jest.Mock;
  let getOperatorWebhookConfig: jest.Mock;
  let WebhookOperatorNotifier: jest.Mock;
  let createOperatorNotificationWorker: jest.Mock;
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
    getOperatorWebhookConfig = jest.fn(() => ({
      url: 'https://webhook.site/test',
      timeoutMs: 900,
    }));
    WebhookOperatorNotifier = jest.fn();
    createOperatorNotificationWorker = jest.fn(() => ({
      close,
      on,
    }));
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../../src/infrastructure/config/operator-webhook', () => ({
      getOperatorWebhookConfig,
    }));
    jest.doMock('../../../src/infrastructure/notifications/webhook-operator-notifier', () => ({
      WebhookOperatorNotifier,
    }));
    jest.doMock('../../../src/infrastructure/queues/operator-notification.worker', () => ({
      createOperatorNotificationWorker,
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

  it('creates the operator notification worker with webhook notifier', () => {
    require('../../../src/operator-notification-worker');

    expect(getOperatorWebhookConfig).toHaveBeenCalledTimes(1);
    expect(WebhookOperatorNotifier).toHaveBeenCalledWith(
      getOperatorWebhookConfig.mock.results[0].value
    );
    expect(createOperatorNotificationWorker).toHaveBeenCalledWith(
      WebhookOperatorNotifier.mock.instances[0]
    );
    expect(on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith('booking-operator-worker ready');
  });

  it('closes the worker on SIGTERM', async () => {
    require('../../../src/operator-notification-worker');

    process.emit('SIGTERM');
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('booking-operator-worker stopped');
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});
