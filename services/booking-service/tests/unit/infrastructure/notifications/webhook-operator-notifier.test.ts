import type { PendingClassificationNotification } from '../../../../src/application/contracts/operator-notifier';
import { ItemSize } from '../../../../src/domain/enums/item-size';
import { WebhookOperatorNotifier } from '../../../../src/infrastructure/notifications/webhook-operator-notifier';

describe('WebhookOperatorNotifier', () => {
  const payload: PendingClassificationNotification = {
    bookingId: 'booking-id',
    userId: 'user-id',
    origin: [-56.16, -34.9],
    destination: [-56.03, -34.83],
    date: '2999-07-10',
    status: 'pending_classification',
    items: [
      {
        id: 'item-id',
        description: 'Objeto desconocido',
        value: '500',
        size: ItemSize.SMALL,
      },
    ],
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should post the pending classification payload to the configured URL', async () => {
    const fetchClient = createFetchMock(204);
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );

    await notifier.notifyPendingClassification(payload);

    expect(fetchClient).toHaveBeenCalledWith('https://operator.example.com/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: expect.any(AbortSignal),
    });
  });

  it('should post the booking rejected email failure payload to the configured URL', async () => {
    const fetchClient = createFetchMock(204);
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );
    const failedEmailPayload = {
      bookingId: 'booking-id',
      userId: 'user-id',
      status: 'booking_rejected_email_delivery_failed' as const,
      customerEmail: 'client@example.com',
      emailSubject: 'No pudimos procesar tu solicitud en MOVE',
      emailBodyText: 'Hola',
      itemDescriptions: ['Objeto no soportado'],
      failureReason: 'Gmail failed',
      failedAt: '2026-06-24T10:00:00.000Z',
      operatorAction: 'Enviar manualmente este correo.',
    };

    await notifier.notifyBookingRejectedEmailDeliveryFailed(failedEmailPayload);

    expect(fetchClient).toHaveBeenCalledWith('https://operator.example.com/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(failedEmailPayload),
      signal: expect.any(AbortSignal),
    });
  });

  it('should resolve when the webhook returns a 2xx response', async () => {
    const fetchClient = createFetchMock(200);
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );

    await expect(notifier.notifyPendingClassification(payload)).resolves.toBeUndefined();
  });

  it('should reject when the webhook returns a non 2xx response', async () => {
    const fetchClient = createFetchMock(500);
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );

    await expect(notifier.notifyPendingClassification(payload)).rejects.toThrow(
      'External service "Operator webhook" failed: Operator webhook is temporarily unavailable'
    );
  });

  it('should abort the request when the configured timeout expires', async () => {
    jest.useFakeTimers();
    const fetchClient = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(
      (_url, init = {}) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 10 },
      fetchClient
    );

    const notification = notifier.notifyPendingClassification(payload);
    jest.advanceTimersByTime(10);

    await expect(notification).rejects.toThrow(
      'External service "Operator webhook" failed: Operator webhook is temporarily unavailable'
    );
    expect(fetchClient.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  function createFetchMock(status: number): jest.MockedFunction<typeof fetch> {
    return jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(null, { status }));
  }
});
