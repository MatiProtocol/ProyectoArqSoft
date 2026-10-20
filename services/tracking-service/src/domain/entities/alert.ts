import type { AlertSeverity } from '../enums/alert-severity';
import type { AlertType } from '../enums/alert-type';

export class Alert {
  constructor(
    public readonly id: string,
    public readonly transferId: number,
    public readonly vehicleId: number,
    public readonly type: AlertType,
    public readonly severity: AlertSeverity,
    public readonly description: string,
    public readonly gpsReadingId: string | undefined,
    public readonly zoneId: number | undefined,
    public readonly occurredAt: string
  ) {}
}
