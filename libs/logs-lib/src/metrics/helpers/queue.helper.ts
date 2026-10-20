import type { Queue } from 'bullmq';
import { getServiceName } from '../../config/env';
import type { ILogger } from '../../logger/domain/interfaces/logger';
import { queueSizeGauge } from '../metrics/queue.metrics';

export function setQueueSize(queueName: string, size: number) {
  queueSizeGauge.set(
    {
      queue_name: queueName,
      service: getServiceName(),
    },
    size
  );
}

export function startQueueMetricsUpdater(
  queue: Queue,
  queueName: string,
  intervalMs: number = 30000,
  logger?: ILogger
): NodeJS.Timeout {
  const update = async function updateMetrics(): Promise<void> {
    try {
      const counts = await queue.getJobCounts();
      const total: number = (counts.waiting ?? 0) + (counts.active ?? 0);
      setQueueSize(queueName, total);
    } catch (error) {
      if (logger) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to update queue metrics', {
          queueName,
          error: err.message,
          stack: err.stack,
        });
      }
    }
  };

  void update();
  return setInterval(update, intervalMs);
}
