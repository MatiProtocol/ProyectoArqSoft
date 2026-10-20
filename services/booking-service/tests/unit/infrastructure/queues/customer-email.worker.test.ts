import { Worker } from 'bullmq';
import type {
  BookingRejectedEmail,
  CustomerEmailNotifier,
} from '../../../../src/application/contracts/customer-email-notifier';
import { createCustomerEmailWorker } from '../../../../src/infrastructure/queues/customer-email.worker';

jest.mock('bullmq', () => ({
  Worker: jest.fn(),
}));

jest.mock('../../../../src/infrastructure/config/bullmq-redis', () => ({
  getBullMqRedisConnection: jest.fn(() => ({ host: 'localhost', port: 6379 })),
}));

describe('createCustomerEmailWorker', () => {
  const payload: BookingRejectedEmail = {
    bookingId: 'booking-id',
    userId: 'user-id',
    to: 'client@example.com',
    subject: 'No pudimos procesar tu solicitud en MOVE',
    bodyText: 'Hola\n\nNo podemos procesar tu solicitud.',
    itemDescriptions: ['Objeto no soportado'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a worker that sends rejected booking emails', async () => {
    const notifyBookingRejected = jest.fn().mockResolvedValue(undefined);
    const notifier: CustomerEmailNotifier = { notifyBookingRejected };
    const workerMock = Worker as unknown as jest.Mock;

    createCustomerEmailWorker(notifier);

    expect(workerMock).toHaveBeenCalledWith('customer-email', expect.any(Function), {
      connection: { host: 'localhost', port: 6379 },
    });

    const processor = workerMock.mock.calls[0][1];
    await processor({ data: payload });

    expect(notifyBookingRejected).toHaveBeenCalledWith(payload);
  });

  it('should propagate notifier errors so BullMQ can retry', async () => {
    const notifyBookingRejected = jest.fn().mockRejectedValue(new Error('Gmail failed'));
    const notifier: CustomerEmailNotifier = { notifyBookingRejected };
    const workerMock = Worker as unknown as jest.Mock;

    createCustomerEmailWorker(notifier);

    const processor = workerMock.mock.calls[0][1];

    await expect(processor({ data: payload })).rejects.toThrow('Gmail failed');
  });

  it('should enqueue an operator notification when the final email attempt fails', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-24T10:00:00.000Z'));
    const notifyBookingRejected = jest.fn().mockRejectedValue(new Error('Gmail failed'));
    const notifier: CustomerEmailNotifier = { notifyBookingRejected };
    const publishBookingRejectedEmailDeliveryFailed = jest.fn().mockResolvedValue(undefined);
    const workerMock = Worker as unknown as jest.Mock;

    createCustomerEmailWorker(notifier, { publishBookingRejectedEmailDeliveryFailed });

    const processor = workerMock.mock.calls[0][1];

    await expect(
      processor({
        data: payload,
        attemptsMade: 2,
        opts: { attempts: 3 },
      })
    ).rejects.toThrow('Gmail failed');

    expect(publishBookingRejectedEmailDeliveryFailed).toHaveBeenCalledWith({
      bookingId: 'booking-id',
      userId: 'user-id',
      status: 'booking_rejected_email_delivery_failed',
      customerEmail: 'client@example.com',
      emailSubject: 'No pudimos procesar tu solicitud en MOVE',
      emailBodyText: 'Hola\n\nNo podemos procesar tu solicitud.',
      itemDescriptions: ['Objeto no soportado'],
      failureReason: 'Gmail failed',
      failedAt: '2026-06-24T10:00:00.000Z',
      operatorAction:
        'Enviar manualmente este correo al cliente usando customerEmail, emailSubject y emailBodyText.',
    });
    jest.useRealTimers();
  });
});
