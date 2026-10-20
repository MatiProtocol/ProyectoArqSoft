let startQueueMetricsUpdater: jest.Mock;
let wrapJobData: jest.Mock;

jest.mock('@move/logs-lib', () => {
  startQueueMetricsUpdater = jest.fn();
  wrapJobData = jest.fn((data) => ({ ...data, _correlationId: 'corr-1' }));
  return {
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    startQueueMetricsUpdater,
    wrapJobData,
  };
});

jest.mock('bullmq', () => ({ Queue: jest.fn() }));
jest.mock('../../../../src/infrastructure/config/bullmq-redis', () => ({
  getBullMqRedisConnection: jest.fn(() => ({ host: 'localhost', port: 6379 })),
}));

import { Queue } from 'bullmq';
import type { AlertNotification } from '../../../../src/application/contracts/operator-notifier';
import { AlertSeverity } from '../../../../src/domain/enums/alert-severity';
import { AlertType } from '../../../../src/domain/enums/alert-type';
import { BullMqAlertNotificationPublisher } from '../../../../src/infrastructure/queues/bullmq-alert-notification.publisher';

function createQueueMock() {
  return { add: jest.fn().mockResolvedValue(undefined) };
}

describe('BullMqAlertNotificationPublisher', () => {
  const payload: AlertNotification = {
    alertId: '507f1f77bcf86cd799439011',
    transferId: 7,
    vehicleId: 1,
    type: AlertType.RED_ZONE_ENTRY,
    severity: AlertSeverity.CRITICAL,
    description: "Vehicle entered red zone 'Centro'",
    occurredAt: '2026-06-23T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts the queue metrics updater on construction', () => {
    const queue = createQueueMock();

    const publisher = new BullMqAlertNotificationPublisher(queue as never);

    expect(startQueueMetricsUpdater).toHaveBeenCalledWith(
      queue,
      'notification-queue',
      30000,
      expect.anything()
    );
    expect(publisher).toBeInstanceOf(BullMqAlertNotificationPublisher);
  });

  it('creates its own queue and connection when none is provided', () => {
    const publisher = new BullMqAlertNotificationPublisher();

    expect(Queue).toHaveBeenCalledWith('notification-queue', {
      connection: { host: 'localhost', port: 6379 },
    });
    expect(publisher).toBeInstanceOf(BullMqAlertNotificationPublisher);
  });

  it('enqueues the alert notification with extensive retries', async () => {
    const queue = createQueueMock();
    const publisher = new BullMqAlertNotificationPublisher(queue as never);

    await publisher.publish(payload);

    expect(wrapJobData).toHaveBeenCalledWith(payload);
    expect(queue.add).toHaveBeenCalledWith(
      'notification-queue',
      { ...payload, _correlationId: 'corr-1' },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 5000 },
      }
    );
  });

  it('propagates queue errors', async () => {
    const queue = { add: jest.fn().mockRejectedValue(new Error('Redis unavailable')) };
    const publisher = new BullMqAlertNotificationPublisher(queue as never);

    await expect(publisher.publish(payload)).rejects.toThrow('Redis unavailable');
  });
});
