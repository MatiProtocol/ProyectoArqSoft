jest.mock('bullmq', () => ({ Worker: jest.fn() }));
jest.mock('../../../../src/infrastructure/config/bullmq-redis', () => ({
  getBullMqRedisConnection: jest.fn(() => ({ host: 'localhost', port: 6379 })),
}));
jest.mock('@move/logs-lib', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  generateCorrelationId: jest.fn(() => 'corr-1'),
  runWithContext: jest.fn((_id: string, fn: () => unknown) => fn()),
  createWrapProcessor: () => (processor: (job: unknown) => unknown) => (job: unknown) =>
    processor(job),
}));

import { Worker } from 'bullmq';
import type {
  AlertNotification,
  OperatorNotifier,
} from '../../../../src/application/contracts/operator-notifier';
import { createNotificationWorker } from '../../../../src/infrastructure/queues/notification.worker';

describe('createNotificationWorker', () => {
  const payload: AlertNotification = {
    alertId: 'alert-1',
    transferId: 7,
    vehicleId: 1,
    type: 'red_zone_entry' as AlertNotification['type'],
    severity: 'critical' as AlertNotification['severity'],
    description: 'Vehicle entered red zone',
    occurredAt: '2026-06-23T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a worker that notifies the operator', async () => {
    const notifyAlert = jest.fn().mockResolvedValue(undefined);
    const operatorNotifier: OperatorNotifier = { notifyAlert };
    const workerMock = Worker as unknown as jest.Mock;

    createNotificationWorker(operatorNotifier);

    expect(workerMock).toHaveBeenCalledWith('notification-queue', expect.any(Function), {
      connection: { host: 'localhost', port: 6379 },
    });

    const processor = workerMock.mock.calls[0][1];
    await processor({ data: payload });

    expect(notifyAlert).toHaveBeenCalledWith(payload);
  });

  it('propagates notifier errors so BullMQ can retry', async () => {
    const notifyAlert = jest.fn().mockRejectedValue(new Error('webhook failed'));
    const operatorNotifier: OperatorNotifier = { notifyAlert };
    const workerMock = Worker as unknown as jest.Mock;

    createNotificationWorker(operatorNotifier);

    const processor = workerMock.mock.calls[0][1];

    await expect(processor({ data: payload })).rejects.toThrow('webhook failed');
  });
});
