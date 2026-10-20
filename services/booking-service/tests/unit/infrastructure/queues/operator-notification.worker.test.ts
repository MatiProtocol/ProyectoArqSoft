import { Worker } from 'bullmq';
import type {
  BookingRejectedEmailDeliveryFailedNotification,
  OperatorNotifier,
  PendingClassificationNotification,
} from '../../../../src/application/contracts/operator-notifier';
import { createOperatorNotificationWorker } from '../../../../src/infrastructure/queues/operator-notification.worker';

jest.mock('bullmq', () => ({
  Worker: jest.fn(),
}));

jest.mock('../../../../src/infrastructure/config/bullmq-redis', () => ({
  getBullMqRedisConnection: jest.fn(() => ({ host: 'localhost', port: 6379 })),
}));

describe('createOperatorNotificationWorker', () => {
  const payload: PendingClassificationNotification = {
    bookingId: 'booking-id',
    userId: 'user-id',
    origin: [-56.16, -34.9],
    destination: [-56.03, -34.83],
    date: '2999-07-10',
    status: 'pending_classification',
    items: [],
  };

  const emailFailedPayload: BookingRejectedEmailDeliveryFailedNotification = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a worker that notifies the operator webhook', async () => {
    const notifyPendingClassification = jest.fn().mockResolvedValue(undefined);
    const operatorNotifier: OperatorNotifier = {
      notifyPendingClassification,
      notifyBookingRejectedEmailDeliveryFailed: jest.fn(),
    };
    const workerMock = Worker as unknown as jest.Mock;

    createOperatorNotificationWorker(operatorNotifier);

    expect(workerMock).toHaveBeenCalledWith('operator-notification', expect.any(Function), {
      connection: { host: 'localhost', port: 6379 },
    });

    const processor = workerMock.mock.calls[0][1];
    const job = {
      data: payload,
    };

    await processor(job);

    expect(notifyPendingClassification).toHaveBeenCalledWith(job.data);
  });

  it('should route booking rejected email failures to the matching notifier method', async () => {
    const notifyBookingRejectedEmailDeliveryFailed = jest.fn().mockResolvedValue(undefined);
    const operatorNotifier: OperatorNotifier = {
      notifyPendingClassification: jest.fn(),
      notifyBookingRejectedEmailDeliveryFailed,
    };
    const workerMock = Worker as unknown as jest.Mock;

    createOperatorNotificationWorker(operatorNotifier);

    const processor = workerMock.mock.calls[0][1];
    await processor({ data: emailFailedPayload });

    expect(notifyBookingRejectedEmailDeliveryFailed).toHaveBeenCalledWith(emailFailedPayload);
    expect(operatorNotifier.notifyPendingClassification).not.toHaveBeenCalled();
  });

  it('should propagate notifier errors so BullMQ can retry', async () => {
    const notifyPendingClassification = jest.fn().mockRejectedValue(new Error('Webhook failed'));
    const operatorNotifier: OperatorNotifier = {
      notifyPendingClassification,
      notifyBookingRejectedEmailDeliveryFailed: jest.fn(),
    };
    const workerMock = Worker as unknown as jest.Mock;

    createOperatorNotificationWorker(operatorNotifier);

    const processor = workerMock.mock.calls[0][1];

    await expect(
      processor({
        data: payload,
      })
    ).rejects.toThrow('Webhook failed');
  });
});
