jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
  },
}));

import type { BookingRejectedEmail } from '../../../../src/application/contracts/customer-email-notifier';
import { BullMqCustomerEmailPublisher } from '../../../../src/infrastructure/queues/bullmq-customer-email.publisher';

function createQueueMock() {
  return {
    add: jest.fn().mockResolvedValue(undefined),
  };
}

describe('BullMqCustomerEmailPublisher', () => {
  const payload: BookingRejectedEmail = {
    bookingId: 'booking-id',
    userId: 'user-id',
    to: 'client@example.com',
    subject: 'No pudimos procesar tu solicitud en MOVE',
    bodyText: 'Hola',
    itemDescriptions: ['Objeto no soportado'],
  };

  it('should enqueue rejected booking email jobs with retries', async () => {
    const customerEmailQueue = createQueueMock();
    const publisher = new BullMqCustomerEmailPublisher(customerEmailQueue as never);

    await publisher.publishBookingRejected(payload);

    expect(customerEmailQueue.add).toHaveBeenCalledWith(
      'notify-booking-rejected',
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
    const customerEmailQueue = { add: jest.fn().mockRejectedValue(queueError) };
    const publisher = new BullMqCustomerEmailPublisher(customerEmailQueue as never);

    await expect(publisher.publishBookingRejected(payload)).rejects.toThrow('Redis unavailable');
  });
});
