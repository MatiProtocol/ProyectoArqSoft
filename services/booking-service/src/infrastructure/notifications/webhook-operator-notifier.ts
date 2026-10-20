import { ErrorFactory } from '@move/errors-lib';
import type {
  BookingRejectedEmailDeliveryFailedNotification,
  OperatorNotification,
  OperatorNotifier,
  PendingClassificationNotification,
} from '../../application/contracts/operator-notifier';
import {
  createExternalServiceCircuitBreaker,
  type ExternalServiceCircuitBreaker,
} from '../circuit-breakers/external-service-circuit-breaker';
import type { OperatorWebhookConfig } from '../config/operator-webhook';

export class WebhookOperatorNotifier implements OperatorNotifier {
  private readonly operatorWebhookBreaker: ExternalServiceCircuitBreaker<
    [OperatorNotification],
    void
  >;

  constructor(
    private readonly config: OperatorWebhookConfig,
    private readonly fetchClient: typeof fetch = fetch
  ) {
    this.operatorWebhookBreaker = createExternalServiceCircuitBreaker(
      (payload: OperatorNotification) => this.sendNotification(payload),
      {
        name: 'operatorWebhook',
        serviceName: 'Operator webhook',
        timeoutMs: config.timeoutMs,
        fallbackMessage: 'Operator webhook is temporarily unavailable',
        retryAfter: '30s',
      }
    );
  }

  async notifyPendingClassification(payload: PendingClassificationNotification): Promise<void> {
    return this.operatorWebhookBreaker.fire(payload);
  }

  async notifyBookingRejectedEmailDeliveryFailed(
    payload: BookingRejectedEmailDeliveryFailedNotification
  ): Promise<void> {
    return this.operatorWebhookBreaker.fire(payload);
  }

  private async sendNotification(payload: OperatorNotification): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchClient(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch((error: unknown) => {
        throw ErrorFactory.externalService(
          'Operator webhook',
          error instanceof Error ? error.message : 'Operator webhook request failed',
          error instanceof Error ? error : undefined
        );
      });

      if (!response.ok) {
        throw ErrorFactory.externalService(
          'Operator webhook',
          `Operator webhook failed with status ${response.status}`,
          undefined,
          { status: response.status }
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
