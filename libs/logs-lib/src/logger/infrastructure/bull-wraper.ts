import type { Job } from 'bullmq';
import type { IContextService } from '../domain/interfaces/context-service';
import type { ILogger } from '../domain/interfaces/logger';

type JobDataWithCorrelationId<T> = T & { _correlationId?: string };

export function wrapJobData<T extends object>(
  data: T,
  generateCorrelationId: () => string = () => crypto.randomUUID()
): T & { _correlationId: string } {
  const correlationId =
    (data as JobDataWithCorrelationId<T>)._correlationId ?? generateCorrelationId();

  return {
    ...data,
    _correlationId: correlationId,
  };
}

export function createWrapProcessor(logger: ILogger, contextService: IContextService) {
  const { runWithContext, generateCorrelationId } = contextService;

  return function wrapProcessor<TData = unknown, TResult = unknown>(
    processor: (job: Job<TData>) => Promise<TResult> | TResult
  ): (job: Job<TData>) => Promise<TResult> {
    return async function wrappedProcessor(job: Job<TData>): Promise<TResult> {
      const correlationId =
        (job.data as JobDataWithCorrelationId<TData>)._correlationId ?? generateCorrelationId();

      return runWithContext(correlationId, async function runInContext() {
        logger.debug(`[BULLMQ] Processing job ${job.id} (${job.name})`, {
          jobId: job.id,
          queueName: job.queueName,
          data: job.data,
        });

        try {
          const result = await processor(job);
          logger.debug(`[BULLMQ] Job ${job.id} completed successfully`);
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error(`[BULLMQ] Job ${job.id} failed`, {
            error: err.message,
            stack: err.stack,
            attemptsMade: job.attemptsMade,
          });
          throw error;
        }
      });
    };
  };
}
