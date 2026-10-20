import { model, Schema, type Types } from 'mongoose';
import { AlertSeverity } from '../../domain/enums/alert-severity';
import { AlertType } from '../../domain/enums/alert-type';

export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
}

export type AlertDocument = {
  _id: Types.ObjectId;
  transferId: number;
  vehicleId: number;
  type: AlertType;
  severity: AlertSeverity;
  description: string;
  gpsReadingId?: string;
  zoneId?: number;
  status: AlertStatus;
  occurredAt: Date;
};

const alertSchema = new Schema<AlertDocument>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    transferId: { type: Number, required: true },
    vehicleId: { type: Number, required: true },
    type: { type: String, enum: Object.values(AlertType), required: true },
    severity: { type: String, enum: Object.values(AlertSeverity), required: true },
    description: { type: String, required: true },
    gpsReadingId: { type: String, required: false },
    zoneId: { type: Number, required: false },
    status: {
      type: String,
      enum: Object.values(AlertStatus),
      default: AlertStatus.ACTIVE,
      required: true,
    },
    occurredAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: true }
);

alertSchema.index({ transferId: 1 });
alertSchema.index({ status: 1 });
alertSchema.index({ type: 1 });
alertSchema.index({ createdAt: -1 });

export const AlertModel = model<AlertDocument>('Alert', alertSchema);
