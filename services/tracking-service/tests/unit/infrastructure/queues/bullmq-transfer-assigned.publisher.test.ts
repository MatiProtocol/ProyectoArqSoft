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
import type { TransferAssignedEvent } from '../../../../src/application/contracts/transfer-assigned.publisher';
import { BullMqTransferAssignedPublisher } from '../../../../src/infrastructure/queues/bullmq-transfer-assigned.publisher';

function createQueueMock() {
  return { add: jest.fn().mockResolvedValue(undefined) };
}

describe('BullMqTransferAssignedPublisher', () => {
  const event: TransferAssignedEvent = {
    bookingId: '507f1f77bcf86cd799439011',
    transferId: 42,
    vehicleId: 1,
    deviceId: 'GPS-001',
    driverId: 'auth0|driver',
    vehicleLabel: 'VAN-12',
    driverName: 'Laura',
    status: 'assigned',
    assignedAt: '2026-06-23T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts the queue metrics updater on construction', () => {
    const queue = createQueueMock();

    const publisher = new BullMqTransferAssignedPublisher(queue as never);

    expect(startQueueMetricsUpdater).toHaveBeenCalledWith(
      queue,
      'transfer-assigned',
      30000,
      expect.anything()
    );
    expect(publisher).toBeInstanceOf(BullMqTransferAssignedPublisher);
  });

  it('creates its own queue and connection when none is provided', () => {
    const publisher = new BullMqTransferAssignedPublisher();

    expect(Queue).toHaveBeenCalledWith('transfer-assigned', {
      connection: { host: 'localhost', port: 6379 },
    });
    expect(publisher).toBeInstanceOf(BullMqTransferAssignedPublisher);
  });

  it('enqueues the transfer assigned event with retries', async () => {
    const queue = createQueueMock();
    const publisher = new BullMqTransferAssignedPublisher(queue as never);

    await publisher.publish(event);

    expect(wrapJobData).toHaveBeenCalledWith(event);
    expect(queue.add).toHaveBeenCalledWith(
      'transfer-assigned',
      { ...event, _correlationId: 'corr-1' },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 5000 },
      }
    );
  });

  it('propagates queue errors', async () => {
    const queue = { add: jest.fn().mockRejectedValue(new Error('Redis unavailable')) };
    const publisher = new BullMqTransferAssignedPublisher(queue as never);

    await expect(publisher.publish(event)).rejects.toThrow('Redis unavailable');
  });
});
