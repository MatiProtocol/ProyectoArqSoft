jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
  },
}));

import type { PendingClassificationNotification } from '../../../../src/application/contracts/operator-notifier';
import { ItemSize } from '../../../../src/domain/enums/item-size';
import { BullMqPendingClassificationPublisher } from '../../../../src/infrastructure/queues/bullmq-pending-classification.publisher';

function createQueueMock() {
  return {
    add: jest.fn().mockResolvedValue(undefined),
  };
}

describe('BullMqPendingClassificationPublisher', () => {
  const payload: PendingClassificationNotification = {
    bookingId: 'booking-id',
    userId: 'user-id',
    origin: [-56.16, -34.9],
    destination: [-56.03, -34.83],
    date: '2999-07-10',
    status: 'pending_classification',
    items: [
      {
        id: 'item-id',
        description: 'Objeto desconocido',
        value: '500',
        size: ItemSize.SMALL,
      },
    ],
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should enqueue manual classification and operator notification jobs', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-19T10:00:00.000Z'));
    const manualClassificationQueue = createQueueMock();
    const operatorNotificationQueue = createQueueMock();
    const publisher = new BullMqPendingClassificationPublisher(
      manualClassificationQueue as never,
      operatorNotificationQueue as never
    );

    await publisher.publishPendingClassification(payload);

    expect(manualClassificationQueue.add).toHaveBeenCalledWith(
      'review-pending-classification',
      {
        ...payload,
        queuedAt: '2026-06-19T10:00:00.000Z',
      },
      {
        jobId: 'booking-id',
        removeOnComplete: false,
        removeOnFail: false,
      }
    );
    expect(operatorNotificationQueue.add).toHaveBeenCalledWith(
      'notify-pending-classification',
      payload,
      expect.objectContaining({
        attempts: expect.any(Number),
        backoff: expect.objectContaining({
          type: 'exponential',
          delay: expect.any(Number),
        }),
      })
    );
  });

  it('should propagate queue errors', async () => {
    const queueError = new Error('Redis unavailable');
    const manualClassificationQueue = { add: jest.fn().mockRejectedValue(queueError) };
    const operatorNotificationQueue = createQueueMock();
    const publisher = new BullMqPendingClassificationPublisher(
      manualClassificationQueue as never,
      operatorNotificationQueue as never
    );

    await expect(publisher.publishPendingClassification(payload)).rejects.toThrow(
      'Redis unavailable'
    );
    expect(operatorNotificationQueue.add).not.toHaveBeenCalled();
  });
});
