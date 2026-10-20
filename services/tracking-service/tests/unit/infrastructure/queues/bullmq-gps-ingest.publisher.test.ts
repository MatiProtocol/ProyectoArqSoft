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
import type { GpsReadingJob } from '../../../../src/application/contracts/gps-ingest.publisher';
import { BullMqGpsIngestPublisher } from '../../../../src/infrastructure/queues/bullmq-gps-ingest.publisher';

function createQueueMock() {
  return { add: jest.fn().mockResolvedValue(undefined) };
}

describe('BullMqGpsIngestPublisher', () => {
  const job: GpsReadingJob = {
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

    const publisher = new BullMqGpsIngestPublisher(queue as never);

    expect(startQueueMetricsUpdater).toHaveBeenCalledWith(
      queue,
      'gps-ingest',
      30000,
      expect.anything()
    );
    expect(publisher).toBeInstanceOf(BullMqGpsIngestPublisher);
  });

  it('enqueues the GPS reading without retries', async () => {
    const queue = createQueueMock();
    const publisher = new BullMqGpsIngestPublisher(queue as never);

    await publisher.publish(job);

    expect(wrapJobData).toHaveBeenCalledWith(job);
    expect(queue.add).toHaveBeenCalledWith(
      'gps-ingest',
      { ...job, _correlationId: 'corr-1' },
      {
        removeOnComplete: true,
        removeOnFail: { age: 3600, count: 1000 },
      }
    );
  });

  it('creates its own queue and connection when none is provided', () => {
    const publisher = new BullMqGpsIngestPublisher();

    expect(Queue).toHaveBeenCalledWith('gps-ingest', {
      connection: { host: 'localhost', port: 6379 },
    });
    expect(publisher).toBeInstanceOf(BullMqGpsIngestPublisher);
  });

  it('propagates queue errors', async () => {
    const queue = { add: jest.fn().mockRejectedValue(new Error('Redis unavailable')) };
    const publisher = new BullMqGpsIngestPublisher(queue as never);

    await expect(publisher.publish(job)).rejects.toThrow('Redis unavailable');
  });
});
