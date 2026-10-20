import { ErrorFactory } from '@move/errors-lib';
import type {
  AlertNotification,
  OperatorNotifier,
} from '../../application/contracts/operator-notifier';
import type { OperatorWebhookConfig } from '../config/operator-webhook';

export class WebhookOperatorNotifier implements OperatorNotifier {
  constructor(
    private readonly config: OperatorWebhookConfig,
    private readonly fetchClient: typeof fetch = fetch
  ) {}

  async notifyAlert(payload: AlertNotification): Promise<void> {
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
