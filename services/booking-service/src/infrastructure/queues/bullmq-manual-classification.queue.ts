import { redisClient } from '@move/auth-lib/dist/infrastructure/redis/client';
import { ErrorFactory } from '@move/errors-lib';
import { Queue } from 'bullmq';
import type {
  ManualClassificationQueue,
  ManualClassificationTask,
} from '../../application/contracts/manual-classification-queue';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import type { ManualClassificationJobData } from './manual-classification-job.data';

const LOCK_TTL_SECONDS = 15 * 60;

type RedisLockClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { NX: true; EX: number }): Promise<string | null>;
  del(key: string): Promise<number>;
};

export class BullMqManualClassificationQueue implements ManualClassificationQueue {
  constructor(
    private readonly queue: Queue<ManualClassificationJobData> = new Queue(
      'manual-classification',
      { connection: getBullMqRedisConnection() }
    ),
    private readonly redis: RedisLockClient = redisClient as unknown as RedisLockClient
  ) {}

  async claimNext(operatorUserId: string): Promise<ManualClassificationTask | undefined> {
    const jobs = await this.queue.getWaiting(0, 50);

    for (const job of jobs) {
      const bookingId = job.data.bookingId;
      const claimed = await this.redis.set(this.lockKey(bookingId), operatorUserId, {
        NX: true,
        EX: LOCK_TTL_SECONDS,
      });

      if (claimed === 'OK') {
        return job.data;
      }
    }

    return undefined;
  }

  async complete(bookingId: string, operatorUserId: string): Promise<void> {
    await this.ensureClaimedBy(bookingId, operatorUserId);
    await this.queue.remove(bookingId);
    await this.redis.del(this.lockKey(bookingId));
  }

  async ensureClaimedBy(bookingId: string, operatorUserId: string): Promise<void> {
    const currentOperator = await this.redis.get(this.lockKey(bookingId));

    if (currentOperator !== operatorUserId) {
      throw ErrorFactory.conflict('Manual classification is not claimed by this operator.');
    }
  }

  private lockKey(bookingId: string): string {
    return `manual-classification:${bookingId}:lock`;
  }
}
