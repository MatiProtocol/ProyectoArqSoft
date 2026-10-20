import type { AlertNotification } from './operator-notifier';

export interface IAlertNotificationPublisher {
  publish(payload: AlertNotification): Promise<void>;
}
