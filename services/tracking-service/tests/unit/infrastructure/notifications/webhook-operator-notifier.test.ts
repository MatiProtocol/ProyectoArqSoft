import type { AlertNotification } from '../../../../src/application/contracts/operator-notifier';
import { AlertSeverity } from '../../../../src/domain/enums/alert-severity';
import { AlertType } from '../../../../src/domain/enums/alert-type';
import { WebhookOperatorNotifier } from '../../../../src/infrastructure/notifications/webhook-operator-notifier';

describe('WebhookOperatorNotifier', () => {
  const payload: AlertNotification = {
    alertId: '507f1f77bcf86cd799439011',
    transferId: 7,
    vehicleId: 1,
    type: AlertType.RED_ZONE_ENTRY,
    severity: AlertSeverity.CRITICAL,
    description: "Vehicle entered red zone 'Centro'",
    occurredAt: '2026-06-23T10:00:00.000Z',
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should post the alert payload to the configured URL', async () => {
    const fetchClient = createFetchMock(204);
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );

    await notifier.notifyAlert(payload);

    expect(fetchClient).toHaveBeenCalledWith('https://operator.example.com/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: expect.any(AbortSignal),
    });
  });

  it('should resolve when the webhook returns a 2xx response', async () => {
    const fetchClient = createFetchMock(200);
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );

    await expect(notifier.notifyAlert(payload)).resolves.toBeUndefined();
  });

  it('should reject when the webhook returns a non 2xx response', async () => {
    const fetchClient = createFetchMock(500);
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );

    await expect(notifier.notifyAlert(payload)).rejects.toThrow(
      'Operator webhook failed with status 500'
    );
  });

  it('should reject when the fetch call itself fails', async () => {
    const fetchClient = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(new Error('network down'));
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );

    await expect(notifier.notifyAlert(payload)).rejects.toThrow('network down');
  });

  it('should reject with a generic message when fetch fails with a non-Error value', async () => {
    const fetchClient = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue('connection reset');
    const notifier = new WebhookOperatorNotifier(
      { url: 'https://operator.example.com/webhook', timeoutMs: 900 },
      fetchClient
    );

    await expect(notifier.notifyAlert(payload)).rejects.toThrow('Operator webhook request failed');
  });

  it('should default to the global fetch implementation when none is provided', () => {
    expect(
      () =>
        new WebhookOperatorNotifier({ url: 'https://operator.example.com/webhook', timeoutMs: 900 })
    ).not.toThrow();
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

    const notification = notifier.notifyAlert(payload);
    jest.advanceTimersByTime(10);

    await expect(notification).rejects.toThrow('aborted');
    expect(fetchClient.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  function createFetchMock(status: number): jest.MockedFunction<typeof fetch> {
    return jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(null, { status }));
  }
});
