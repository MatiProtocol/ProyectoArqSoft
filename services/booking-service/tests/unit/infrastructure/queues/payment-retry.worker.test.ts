jest.mock('@move/logs-lib', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { logger } from '@move/logs-lib';
import { Worker } from 'bullmq';
import type { PayBookingHandler } from '../../../../src/application/commands/pay-booking/pay-booking.handler';
import { createPaymentRetryWorker } from '../../../../src/infrastructure/queues/payment-retry.worker';

jest.mock('bullmq', () => ({
  Worker: jest.fn(),
}));

jest.mock('../../../../src/infrastructure/config/bullmq-redis', () => ({
  getBullMqRedisConnection: jest.fn(() => ({ host: 'localhost', port: 6379 })),
}));

describe('createPaymentRetryWorker', () => {
  const jobData = {
    bookingId: 'booking-id',
    userId: 'user-id',
    methodToken: 'tok_visa',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a worker that retries the pay-booking use case', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const handler = { execute } as unknown as PayBookingHandler;
    const workerMock = Worker as unknown as jest.Mock;

    createPaymentRetryWorker(handler);

    expect(workerMock).toHaveBeenCalledWith('payment-retry', expect.any(Function), {
      connection: { host: 'localhost', port: 6379 },
    });

    const processor = workerMock.mock.calls[0][1];
    await processor({ data: jobData });

    expect(execute).toHaveBeenCalledWith(jobData);
  });

  it('should propagate handler errors so BullMQ can retry', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('Payment gateway is unavailable'));
    const handler = { execute } as unknown as PayBookingHandler;
    const workerMock = Worker as unknown as jest.Mock;

    createPaymentRetryWorker(handler);

    const processor = workerMock.mock.calls[0][1];

    await expect(
      processor({ data: jobData, attemptsMade: 0, opts: { attempts: 3 } })
    ).rejects.toThrow('Payment gateway is unavailable');
  });

  it('should log an error when the final retry attempt fails', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('Payment gateway is unavailable'));
    const handler = { execute } as unknown as PayBookingHandler;
    const workerMock = Worker as unknown as jest.Mock;

    createPaymentRetryWorker(handler);

    const processor = workerMock.mock.calls[0][1];

    await expect(
      processor({ data: jobData, attemptsMade: 2, opts: { attempts: 3 } })
    ).rejects.toThrow('Payment gateway is unavailable');

    expect(logger.error).toHaveBeenCalledWith(
      'Payment retry exhausted, booking remains pending payment',
      expect.objectContaining({
        bookingId: 'booking-id',
        userId: 'user-id',
        error: 'Payment gateway is unavailable',
      })
    );
  });

  it('should not log the final-attempt error when more attempts remain', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('Payment gateway is unavailable'));
    const handler = { execute } as unknown as PayBookingHandler;
    const workerMock = Worker as unknown as jest.Mock;

    createPaymentRetryWorker(handler);

    const processor = workerMock.mock.calls[0][1];

    await expect(
      processor({ data: jobData, attemptsMade: 0, opts: { attempts: 3 } })
    ).rejects.toThrow('Payment gateway is unavailable');

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log a stringified error when the final attempt fails with a non-Error value', async () => {
    const execute = jest.fn().mockRejectedValue('circuit open');
    const handler = { execute } as unknown as PayBookingHandler;
    const workerMock = Worker as unknown as jest.Mock;

    createPaymentRetryWorker(handler);

    const processor = workerMock.mock.calls[0][1];

    await expect(processor({ data: jobData, attemptsMade: 2, opts: { attempts: 3 } })).rejects.toBe(
      'circuit open'
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Payment retry exhausted, booking remains pending payment',
      expect.objectContaining({ error: 'circuit open' })
    );
  });

  it('should default to a single attempt when opts.attempts is not set', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('Payment gateway is unavailable'));
    const handler = { execute } as unknown as PayBookingHandler;
    const workerMock = Worker as unknown as jest.Mock;

    createPaymentRetryWorker(handler);

    const processor = workerMock.mock.calls[0][1];

    await expect(processor({ data: jobData, attemptsMade: 0, opts: {} })).rejects.toThrow(
      'Payment gateway is unavailable'
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Payment retry exhausted, booking remains pending payment',
      expect.objectContaining({ bookingId: 'booking-id' })
    );
  });
});
