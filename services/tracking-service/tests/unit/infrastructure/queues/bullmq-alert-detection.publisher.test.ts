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
import type { AlertDetectionJob } from '../../../../src/application/contracts/alert-detection.publisher';
import { BullMqAlertDetectionPublisher } from '../../../../src/infrastructure/queues/bullmq-alert-detection.publisher';

function createQueueMock() {
  return { add: jest.fn().mockResolvedValue(undefined) };
}

describe('BullMqAlertDetectionPublisher', () => {
  const job: AlertDetectionJob = {
    gpsReadingId: '507f1f77bcf86cd799439011',
    transferId: 7,
    vehicleId: 1,
    deviceId: 'GPS-001',
    coordinates: [-56.16, -34.9],
    timestamp: '2026-06-23T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts the queue metrics updater on construction', () => {
    const queue = createQueueMock();

    const publisher = new BullMqAlertDetectionPublisher(queue as never);

    expect(startQueueMetricsUpdater).toHaveBeenCalledWith(
      queue,
      'alert-detection',
      30000,
      expect.anything()
    );
    expect(publisher).toBeInstanceOf(BullMqAlertDetectionPublisher);
  });

  it('creates its own queue and connection when none is provided', () => {
    const publisher = new BullMqAlertDetectionPublisher();

    expect(Queue).toHaveBeenCalledWith('alert-detection', {
      connection: { host: 'localhost', port: 6379 },
    });
    expect(publisher).toBeInstanceOf(BullMqAlertDetectionPublisher);
  });

  it('enqueues the alert detection job with moderate retries', async () => {
    const queue = createQueueMock();
    const publisher = new BullMqAlertDetectionPublisher(queue as never);

    await publisher.publish(job);

    expect(wrapJobData).toHaveBeenCalledWith(job);
    expect(queue.add).toHaveBeenCalledWith(
      'alert-detection',
      { ...job, _correlationId: 'corr-1' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 5000 },
      }
    );
  });

  it('propagates queue errors', async () => {
    const queue = { add: jest.fn().mockRejectedValue(new Error('Redis unavailable')) };
    const publisher = new BullMqAlertDetectionPublisher(queue as never);

    await expect(publisher.publish(job)).rejects.toThrow('Redis unavailable');
  });
});
