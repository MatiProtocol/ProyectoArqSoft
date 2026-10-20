import type { Queue } from 'bullmq';
import { getServiceName } from '../../../../src/config/env';
import type { ILogger } from '../../../../src/logger/domain/interfaces/logger';
import {
  setQueueSize,
  startQueueMetricsUpdater,
} from '../../../../src/metrics/helpers/queue.helper';
import { queueSizeGauge } from '../../../../src/metrics/metrics/queue.metrics';

jest.mock('../../../../src/config/env', () => ({
  getServiceName: jest.fn(),
}));

jest.mock('../../../../src/metrics/metrics/queue.metrics', () => ({
  queueSizeGauge: {
    set: jest.fn(),
  },
}));

const mockedGetServiceName = jest.mocked(getServiceName);

describe('queue.helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServiceName.mockReturnValue('test-service');
  });

  describe('setQueueSize', () => {
    it('should set queue size with correct labels', () => {
      setQueueSize('email-queue', 42);

      expect(queueSizeGauge.set).toHaveBeenCalledTimes(1);
      expect(queueSizeGauge.set).toHaveBeenCalledWith(
        {
          queue_name: 'email-queue',
          service: 'test-service',
        },
        42
      );
    });

    it('should support zero queue size', () => {
      setQueueSize('email-queue', 0);

      expect(queueSizeGauge.set).toHaveBeenCalledWith(
        {
          queue_name: 'email-queue',
          service: 'test-service',
        },
        0
      );
    });
  });

  describe('startQueueMetricsUpdater', () => {
    let mockQueue: jest.Mocked<Queue>;
    let mockLogger: jest.Mocked<ILogger>;
    let setIntervalSpy: jest.SpyInstance;
    let intervalCallback: (() => Promise<void>) | undefined;

    beforeEach(() => {
      mockQueue = {
        getJobCounts: jest.fn(),
      } as unknown as jest.Mocked<Queue>;

      mockLogger = {
        error: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        log: jest.fn(),
      } as jest.Mocked<ILogger>;

      intervalCallback = undefined;

      setIntervalSpy = jest
        .spyOn(global, 'setInterval')
        .mockImplementation((callback, _delay, ..._args) => {
          intervalCallback = callback as () => Promise<void>;
          return {} as unknown as NodeJS.Timeout;
        });
    });

    afterEach(() => {
      setIntervalSpy.mockRestore();
      jest.clearAllMocks();
      intervalCallback = undefined;
    });

    it('should call update immediately and then set interval', async () => {
      const counts = { waiting: 10, active: 5, completed: 0, failed: 0, delayed: 0 };
      mockQueue.getJobCounts.mockResolvedValue(counts);

      const intervalId = startQueueMetricsUpdater(mockQueue, 'test-queue', 5000);

      await Promise.resolve();

      expect(mockQueue.getJobCounts).toHaveBeenCalledTimes(1);
      expect(queueSizeGauge.set).toHaveBeenCalledWith(
        {
          queue_name: 'test-queue',
          service: 'test-service',
        },
        15
      );

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      expect(intervalId).toBeDefined();
    });

    it('should use default interval 30000 if not provided', async () => {
      const counts = { waiting: 0, active: 0 };
      mockQueue.getJobCounts.mockResolvedValue(counts);

      startQueueMetricsUpdater(mockQueue, 'test-queue');
      await Promise.resolve();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
    });

    it('should handle undefined waiting/active fields gracefully', async () => {
      const counts = {
        waiting: undefined as unknown as number,
        active: undefined as unknown as number,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
      mockQueue.getJobCounts.mockResolvedValue(counts);

      startQueueMetricsUpdater(mockQueue, 'test-queue');
      await Promise.resolve();

      expect(queueSizeGauge.set).toHaveBeenCalledWith(
        expect.objectContaining({ queue_name: 'test-queue' }),
        0
      );
    });

    it('should log error when getJobCounts fails and logger is provided', async () => {
      const error = new Error('Connection timeout');
      mockQueue.getJobCounts.mockRejectedValue(error);

      startQueueMetricsUpdater(mockQueue, 'test-queue', 30000, mockLogger);
      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update queue metrics', {
        queueName: 'test-queue',
        error: 'Connection timeout',
        stack: expect.any(String),
      });
      expect(queueSizeGauge.set).not.toHaveBeenCalled();
    });

    it('should handle non-Error rejection (string) and convert to Error', async () => {
      const nonError = 'Something broke';
      mockQueue.getJobCounts.mockRejectedValue(nonError);

      startQueueMetricsUpdater(mockQueue, 'test-queue', 30000, mockLogger);
      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update queue metrics', {
        queueName: 'test-queue',
        error: 'Something broke',
        stack: expect.any(String),
      });
    });

    it('should not log error if logger is not provided', async () => {
      const error = new Error('Fatal');
      mockQueue.getJobCounts.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      startQueueMetricsUpdater(mockQueue, 'test-queue');
      await Promise.resolve();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(queueSizeGauge.set).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should call update periodically when interval fires', async () => {
      const counts1 = { waiting: 1, active: 2 };
      const counts2 = { waiting: 3, active: 4 };
      mockQueue.getJobCounts.mockResolvedValueOnce(counts1).mockResolvedValueOnce(counts2);

      startQueueMetricsUpdater(mockQueue, 'test-queue', 1000);
      await Promise.resolve();

      expect(mockQueue.getJobCounts).toHaveBeenCalledTimes(1);
      expect(queueSizeGauge.set).toHaveBeenCalledWith(expect.anything(), 3);

      if (intervalCallback) {
        await intervalCallback();
      }

      expect(mockQueue.getJobCounts).toHaveBeenCalledTimes(2);
      expect(queueSizeGauge.set).toHaveBeenCalledWith(expect.anything(), 7);
    });

    it('should return the interval ID from setInterval', () => {
      const intervalId = startQueueMetricsUpdater(mockQueue, 'test-queue');
      expect(intervalId).toBeDefined();
      expect(typeof intervalId).toBe('object');
    });
  });
});
