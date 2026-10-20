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
import type { DetectSituationsHandler } from '../../../../src/application/commands/detect-situations/detect-situations.handler';
import { createAlertDetectionWorker } from '../../../../src/infrastructure/queues/alert-detection.worker';

describe('createAlertDetectionWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a worker on the alert-detection queue', () => {
    const handler = { execute: jest.fn() } as unknown as jest.Mocked<DetectSituationsHandler>;
    const workerMock = Worker as unknown as jest.Mock;

    createAlertDetectionWorker(handler);

    expect(workerMock).toHaveBeenCalledWith('alert-detection', expect.any(Function), {
      connection: { host: 'localhost', port: 6379 },
    });
  });

  it('executes the handler with a DetectSituationsCommand built from the job data', async () => {
    const handler = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DetectSituationsHandler>;
    const workerMock = Worker as unknown as jest.Mock;

    createAlertDetectionWorker(handler);

    const processor = workerMock.mock.calls[0][1];
    const job = {
      data: {
        gpsReadingId: '507f1f77bcf86cd799439011',
        transferId: 7,
        vehicleId: 1,
        deviceId: 'GPS-001',
        coordinates: [-56.16, -34.9],
        timestamp: '2026-06-23T10:00:00.000Z',
      },
    };

    await processor(job);

    expect(handler.execute).toHaveBeenCalledTimes(1);
    const command = handler.execute.mock.calls[0][0];
    expect(command.gpsReadingId).toBe('507f1f77bcf86cd799439011');
    expect(command.transferId).toBe(7);
    expect(command.coordinates).toEqual([-56.16, -34.9]);
  });

  it('propagates handler errors so BullMQ can retry', async () => {
    const handler = {
      execute: jest.fn().mockRejectedValue(new Error('detection failed')),
    } as unknown as jest.Mocked<DetectSituationsHandler>;
    const workerMock = Worker as unknown as jest.Mock;

    createAlertDetectionWorker(handler);

    const processor = workerMock.mock.calls[0][1];

    await expect(
      processor({
        data: {
          gpsReadingId: '507f1f77bcf86cd799439011',
          transferId: 7,
          vehicleId: 1,
          deviceId: 'GPS-001',
          coordinates: [-56.16, -34.9],
          timestamp: '2026-06-23T10:00:00.000Z',
        },
      })
    ).rejects.toThrow('detection failed');
  });
});
