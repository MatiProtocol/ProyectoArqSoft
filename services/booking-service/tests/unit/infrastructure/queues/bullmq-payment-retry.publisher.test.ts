jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
  },
}));

import type { PaymentRetryJob } from '../../../../src/application/contracts/payment-retry.publisher';
import { BullMqPaymentRetryPublisher } from '../../../../src/infrastructure/queues/bullmq-payment-retry.publisher';

function createQueueMock() {
  return {
    add: jest.fn().mockResolvedValue(undefined),
  };
}

describe('BullMqPaymentRetryPublisher', () => {
  const payload: PaymentRetryJob = {
    bookingId: 'booking-id',
    userId: 'user-id',
    methodToken: 'tok_visa',
  };

  it('should enqueue payment retry jobs with exponential backoff and 3 attempts', async () => {
    const paymentRetryQueue = createQueueMock();
    const publisher = new BullMqPaymentRetryPublisher(paymentRetryQueue as never);

    await publisher.publishPaymentRetry(payload);

    expect(paymentRetryQueue.add).toHaveBeenCalledWith(
      'retry-payment',
      payload,
      expect.objectContaining({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      })
    );
  });

  it('should propagate queue errors', async () => {
    const queueError = new Error('Redis unavailable');
    const paymentRetryQueue = { add: jest.fn().mockRejectedValue(queueError) };
    const publisher = new BullMqPaymentRetryPublisher(paymentRetryQueue as never);

    await expect(publisher.publishPaymentRetry(payload)).rejects.toThrow('Redis unavailable');
  });
});
