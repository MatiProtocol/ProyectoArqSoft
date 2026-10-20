jest.mock('@move/logs-lib', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

import type { BookingRejectedEmailDeliveryFailedNotification } from '../../../../src/application/contracts/operator-notifier';
import { BullMqOperatorNotificationPublisher } from '../../../../src/infrastructure/queues/bullmq-operator-notification.publisher';

function createQueueMock() {
  return {
    add: jest.fn().mockResolvedValue(undefined),
  };
}

describe('BullMqOperatorNotificationPublisher', () => {
  const payload: BookingRejectedEmailDeliveryFailedNotification = {
    bookingId: 'booking-id',
    userId: 'user-id',
    status: 'booking_rejected_email_delivery_failed',
    customerEmail: 'client@example.com',
    emailSubject: 'No pudimos procesar tu solicitud en MOVE',
    emailBodyText: 'Hola',
    itemDescriptions: ['Objeto no soportado'],
    failureReason: 'Gmail failed',
    failedAt: '2026-06-24T10:00:00.000Z',
    operatorAction: 'Enviar manualmente este correo.',
  };

  it('should enqueue booking rejected email failure notifications with retries', async () => {
    const operatorNotificationQueue = createQueueMock();
    const publisher = new BullMqOperatorNotificationPublisher(operatorNotificationQueue as never);

    await publisher.publishBookingRejectedEmailDeliveryFailed(payload);

    expect(operatorNotificationQueue.add).toHaveBeenCalledWith(
      'notify-booking-rejected-email-failed',
      payload,
      expect.objectContaining({
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
      })
    );
  });

  it('should propagate queue errors', async () => {
    const queueError = new Error('Redis unavailable');
    const operatorNotificationQueue = { add: jest.fn().mockRejectedValue(queueError) };
    const publisher = new BullMqOperatorNotificationPublisher(operatorNotificationQueue as never);

    await expect(publisher.publishBookingRejectedEmailDeliveryFailed(payload)).rejects.toThrow(
      'Redis unavailable'
    );
  });
});
