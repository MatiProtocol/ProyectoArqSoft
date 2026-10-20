import type { PendingClassificationNotification } from './operator-notifier';

export interface PendingClassificationPublisher {
  publishPendingClassification(payload: PendingClassificationNotification): Promise<void>;
}
