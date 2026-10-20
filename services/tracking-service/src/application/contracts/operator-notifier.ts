import type { AlertSeverity } from '../../domain/enums/alert-severity';
import type { AlertType } from '../../domain/enums/alert-type';

export type AlertNotification = {
  alertId: string;
  transferId: number;
  vehicleId: number;
  type: AlertType;
  severity: AlertSeverity;
  description: string;
  occurredAt: string;
};

export interface OperatorNotifier {
  notifyAlert(payload: AlertNotification): Promise<void>;
}
