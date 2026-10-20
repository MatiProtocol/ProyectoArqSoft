import type { Job } from 'bullmq';
import type { IContextService } from '../../../src/logger/domain/interfaces/context-service';

import type { ILogger } from '../../../src/logger/domain/interfaces/logger';
import { createWrapProcessor, wrapJobData } from '../../../src/logger/infrastructure/bull-wraper';

const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

const mockContextService: jest.Mocked<IContextService> = {
  runWithContext: jest.fn(),
  generateCorrelationId: jest.fn(),
};

function createMockJob<T>(overrides: Partial<Job<T>> = {}): Job<T> {
  return {
    id: 'job-123',
    name: 'test-job',
    queueName: 'test-queue',
    data: {} as T,
    attemptsMade: 0,
    ...overrides,
  } as Job<T>;
}

describe('wrapJobData', () => {
  it('should add _correlationId if not present', () => {
    const data = { foo: 'bar' };
    const mockGen = jest.fn().mockReturnValue('generated-id');
    const result = wrapJobData(data, mockGen);

    expect(result).toEqual({
      foo: 'bar',
      _correlationId: 'generated-id',
    });
    expect(mockGen).toHaveBeenCalledTimes(1);
  });

  it('should keep existing _correlationId and not generate a new one', () => {
    const data = { foo: 'bar', _correlationId: 'existing-id' };
    const mockGen = jest.fn();
    const result = wrapJobData(data, mockGen);

    expect(result).toEqual({
      foo: 'bar',
      _correlationId: 'existing-id',
    });
    expect(mockGen).not.toHaveBeenCalled();
  });

  it('should use crypto.randomUUID by default when no generator is provided', () => {
    const randomUUIDSpy = jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('123e4567-e89b-12d3-a456-426614174000');

    const data = { foo: 'bar' };
    const result = wrapJobData(data);

    expect(result).toEqual({
      foo: 'bar',
      _correlationId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(randomUUIDSpy).toHaveBeenCalledTimes(1);

    randomUUIDSpy.mockRestore();
  });
});

describe('createWrapProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a wrapProcessor function', () => {
    const wrapProcessor = createWrapProcessor(mockLogger, mockContextService);
    expect(typeof wrapProcessor).toBe('function');
  });

  describe('wrapProcessor', () => {
    let wrapProcessor: ReturnType<typeof createWrapProcessor>;
    let processor: jest.Mock;

    beforeEach(() => {
      wrapProcessor = createWrapProcessor(mockLogger, mockContextService);
      processor = jest.fn();
      mockContextService.runWithContext.mockImplementation((_id, fn) => fn());
    });

    it("should execute the processor inside the context with job's correlationId", async () => {
      const job = createMockJob({ data: { _correlationId: 'job-correlation' } });
      processor.mockResolvedValue('result');

      const wrapped = wrapProcessor(processor);
      const result = await wrapped(job);

      expect(result).toBe('result');
      expect(mockContextService.runWithContext).toHaveBeenCalledWith(
        'job-correlation',
        expect.any(Function)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[BULLMQ] Processing job job-123 (test-job)',
        expect.objectContaining({
          jobId: 'job-123',
          queueName: 'test-queue',
          data: { _correlationId: 'job-correlation' },
        })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('[BULLMQ] Job job-123 completed successfully');
      expect(processor).toHaveBeenCalledWith(job);
    });

    it('should generate a correlationId if not present in job.data', async () => {
      const job = createMockJob({ data: {} });
      mockContextService.generateCorrelationId.mockReturnValue('generated-correlation');
      processor.mockResolvedValue('result');

      const wrapped = wrapProcessor(processor);
      await wrapped(job);

      expect(mockContextService.runWithContext).toHaveBeenCalledWith(
        'generated-correlation',
        expect.any(Function)
      );
      expect(mockContextService.generateCorrelationId).toHaveBeenCalledTimes(1);
    });

    it('should log debug messages on start and successful completion', async () => {
      const job = createMockJob({ data: { _correlationId: 'test-id' } });
      processor.mockResolvedValue('result');

      const wrapped = wrapProcessor(processor);
      await wrapped(job);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[BULLMQ] Processing job job-123 (test-job)',
        expect.objectContaining({ jobId: 'job-123' })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('[BULLMQ] Job job-123 completed successfully');
    });

    it('should log error and rethrow when processor fails', async () => {
      const job = createMockJob({ data: {}, attemptsMade: 2 });
      const error = new Error('Something went wrong');
      processor.mockRejectedValue(error);

      const wrapped = wrapProcessor(processor);

      await expect(wrapped(job)).rejects.toThrow('Something went wrong');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[BULLMQ] Job job-123 failed',
        expect.objectContaining({
          error: 'Something went wrong',
          stack: error.stack,
          attemptsMade: 2,
        })
      );
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('completed successfully'),
        expect.anything()
      );
    });

    it('should handle non-Error errors and convert them for logging', async () => {
      const job = createMockJob({ data: {} });
      const nonError = 'string error';
      processor.mockRejectedValue(nonError);

      const wrapped = wrapProcessor(processor);

      await expect(wrapped(job)).rejects.toBe('string error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[BULLMQ] Job job-123 failed',
        expect.objectContaining({
          error: 'string error',
          stack: expect.any(String),
        })
      );
    });

    it('should respect synchronous processor result (non-Promise)', async () => {
      const job = createMockJob({ data: {} });
      processor.mockReturnValue('sync-result');

      const wrapped = wrapProcessor(processor);
      const result = await wrapped(job);

      expect(result).toBe('sync-result');
      expect(mockLogger.debug).toHaveBeenCalledWith('[BULLMQ] Job job-123 completed successfully');
    });

    it('should work with async processor returning a Promise', async () => {
      const job = createMockJob({ data: {} });
      processor.mockResolvedValue('async-result');

      const wrapped = wrapProcessor(processor);
      const result = await wrapped(job);

      expect(result).toBe('async-result');
    });

    it('should propagate the runWithContext correctly', async () => {
      const job = createMockJob({ data: { _correlationId: 'ctx-id' } });
      processor.mockResolvedValue('ok');

      mockContextService.runWithContext.mockImplementation(async (id, fn) => {
        expect(id).toBe('ctx-id');
        return fn();
      });

      const wrapped = wrapProcessor(processor);
      await wrapped(job);

      expect(mockContextService.runWithContext).toHaveBeenCalled();
    });

    it('should pass the original job object to the processor', async () => {
      const job = createMockJob({ data: { foo: 'bar' } });
      processor.mockResolvedValue('result');

      const wrapped = wrapProcessor(processor);
      await wrapped(job);

      expect(processor).toHaveBeenCalledWith(job);
    });

    it('should not mask the original error type (rethrows exactly the same error)', async () => {
      const job = createMockJob({ data: {} });
      const error = new TypeError('Type error');
      processor.mockRejectedValue(error);

      const wrapped = wrapProcessor(processor);

      await expect(wrapped(job)).rejects.toThrow(TypeError);
      await expect(wrapped(job)).rejects.toThrow('Type error');
    });

    it('should include attemptsMade in error log context', async () => {
      const job = createMockJob({ data: {}, attemptsMade: 5 });
      const error = new Error('Failed');
      processor.mockRejectedValue(error);

      const wrapped = wrapProcessor(processor);

      try {
        await wrapped(job);
      } catch {}

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[BULLMQ] Job job-123 failed',
        expect.objectContaining({
          attemptsMade: 5,
        })
      );
    });

    it('should call generateCorrelationId only when needed (not when present)', async () => {
      const jobWithId = createMockJob({ data: { _correlationId: 'present' } });
      const jobWithoutId = createMockJob({ data: {} });

      mockContextService.generateCorrelationId.mockReturnValue('generated');

      const wrapped = wrapProcessor(processor);
      await wrapped(jobWithId);
      await wrapped(jobWithoutId);

      expect(mockContextService.generateCorrelationId).toHaveBeenCalledTimes(1);
    });
  });
});
