import { Worker } from 'bullmq';

jest.mock('bullmq', () => ({
  Worker: jest.fn(),
}));
jest.mock('../../../../src/infrastructure/config/bullmq-redis', () => ({
  getBullMqRedisConnection: jest.fn(() => ({ host: 'localhost', port: 6379 })),
}));

import type { RecordAssignedResourcesHandler } from '../../../../src/application/commands/record-assigned-resources/record-assigned-resources.handler';
import { createTransferAssignedWorker } from '../../../../src/infrastructure/queues/transfer-assigned.worker';

describe('createTransferAssignedWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a worker on the transfer-assigned queue', () => {
    const handler: jest.Mocked<RecordAssignedResourcesHandler> = {
      execute: jest.fn(),
    } as never;

    createTransferAssignedWorker(handler);

    expect(Worker).toHaveBeenCalledWith('transfer-assigned', expect.any(Function), {
      connection: { host: 'localhost', port: 6379 },
    });
  });

  it('executes the handler with the job data', async () => {
    const handler: jest.Mocked<RecordAssignedResourcesHandler> = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as never;
    createTransferAssignedWorker(handler);

    const processor = (Worker as unknown as jest.Mock).mock.calls[0][1];
    await processor({
      data: {
        bookingId: 'booking_1',
        transferId: 42,
        vehicleId: 1,
        deviceId: 'GPS-001',
        driverId: 'auth0|driver',
        status: 'assigned',
        assignedAt: '2026-06-25T00:00:00.000Z',
      },
    });

    expect(handler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ bookingId: 'booking_1', transferId: 42 }),
      })
    );
  });
});
