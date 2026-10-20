jest.mock('@move/auth-lib/dist/infrastructure/redis/client', () => ({
  redisClient: {},
}));

import { BullMqManualClassificationQueue } from '../../../../src/infrastructure/queues/bullmq-manual-classification.queue';

describe('BullMqManualClassificationQueue', () => {
  const bookingId = '507f1f77bcf86cd799439011';
  const lockKey = `manual-classification:${bookingId}:lock`;
  let queue: {
    getWaiting: jest.Mock;
    remove: jest.Mock;
  };
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    queue = {
      getWaiting: jest.fn(),
      remove: jest.fn().mockResolvedValue(1),
    };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    };
  });

  it('should claim the first unlocked waiting job', async () => {
    const jobData = {
      bookingId,
      userId: 'user_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2999-07-10',
      status: 'pending_classification' as const,
      queuedAt: '2026-06-23T10:00:00.000Z',
      items: [],
    };
    queue.getWaiting.mockResolvedValueOnce([{ data: jobData }]);
    redis.set.mockResolvedValueOnce('OK');
    const manualQueue = new BullMqManualClassificationQueue(queue as never, redis);

    const result = await manualQueue.claimNext('operator_123');

    expect(result).toBe(jobData);
    expect(queue.getWaiting).toHaveBeenCalledWith(0, 50);
    expect(redis.set).toHaveBeenCalledWith(lockKey, 'operator_123', {
      NX: true,
      EX: 900,
    });
  });

  it('should skip locked waiting jobs', async () => {
    queue.getWaiting.mockResolvedValueOnce([{ data: { bookingId } }]);
    redis.set.mockResolvedValueOnce(null);
    const manualQueue = new BullMqManualClassificationQueue(queue as never, redis);

    await expect(manualQueue.claimNext('operator_123')).resolves.toBeUndefined();
  });

  it('should reject when the booking is not claimed by the operator', async () => {
    redis.get.mockResolvedValueOnce('other_operator');
    const manualQueue = new BullMqManualClassificationQueue(queue as never, redis);

    await expect(manualQueue.ensureClaimedBy(bookingId, 'operator_123')).rejects.toMatchObject({
      message: 'Manual classification is not claimed by this operator.',
      status: 409,
    });
  });

  it('should remove the job and release the lock when completed', async () => {
    redis.get.mockResolvedValueOnce('operator_123');
    const manualQueue = new BullMqManualClassificationQueue(queue as never, redis);

    await manualQueue.complete(bookingId, 'operator_123');

    expect(queue.remove).toHaveBeenCalledWith(bookingId);
    expect(redis.del).toHaveBeenCalledWith(lockKey);
  });
});
