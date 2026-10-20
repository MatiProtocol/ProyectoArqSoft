describe('notification-worker entrypoint', () => {
  let close: jest.Mock;
  let on: jest.Mock;
  let getOperatorWebhookConfig: jest.Mock;
  let WebhookOperatorNotifier: jest.Mock;
  let createNotificationWorker: jest.Mock;
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
      url: 'https://operator.example.com/webhook',
      timeoutMs: 2000,
    }));
    WebhookOperatorNotifier = jest.fn();
    createNotificationWorker = jest.fn(() => ({ close, on }));
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
    jest.doMock('../../../src/infrastructure/queues/notification.worker', () => ({
      createNotificationWorker,
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

  it('creates the notification worker with a webhook notifier', () => {
    require('../../../src/notification-worker');

    expect(getOperatorWebhookConfig).toHaveBeenCalledTimes(1);
    expect(WebhookOperatorNotifier).toHaveBeenCalledWith(
      getOperatorWebhookConfig.mock.results[0].value
    );
    expect(createNotificationWorker).toHaveBeenCalledWith(
      WebhookOperatorNotifier.mock.instances[0]
    );
    expect(on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith('tracking-notification-worker ready');
  });

  it('logs a warning when a job fails', () => {
    require('../../../src/notification-worker');

    const failedListener = on.mock.calls.find(([event]) => event === 'failed')[1];
    failedListener({ id: 'job-1', data: { alertId: 'alert-1' } }, new Error('boom'));

    expect(logger.warn).toHaveBeenCalledWith('tracking-notification-worker job failed', {
      jobId: 'job-1',
      alertId: 'alert-1',
      error: 'boom',
    });
  });

  it('logs an error when the worker emits one', () => {
    require('../../../src/notification-worker');

    const errorListener = on.mock.calls.find(([event]) => event === 'error')[1];
    errorListener(new Error('connection lost'));

    expect(logger.error).toHaveBeenCalledWith('tracking-notification-worker error', {
      error: 'connection lost',
    });
  });

  it('closes the worker on SIGTERM', async () => {
    require('../../../src/notification-worker');

    process.emit('SIGTERM');
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('tracking-notification-worker stopped');
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('closes the worker on SIGINT', async () => {
    require('../../../src/notification-worker');

    process.emit('SIGINT');
    await new Promise(process.nextTick);

    expect(close).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('exits with code 1 when shutdown fails', async () => {
    close.mockRejectedValueOnce(new Error('close failed'));
    require('../../../src/notification-worker');

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-notification-worker shutdown failed', {
      error: 'close failed',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when shutdown fails with a non-Error value', async () => {
    close.mockRejectedValueOnce('close exploded');
    require('../../../src/notification-worker');

    process.emit('SIGTERM');
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith('tracking-notification-worker shutdown failed', {
      error: 'close exploded',
    });
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
