import { model, Schema } from 'mongoose';
import { TransferStatus } from '../../domain/enums/transfer-status';
import type { Coordinates } from '../../domain/value-objects/coordinates';

export type TransferDocument = {
  _id: number;
  bookingId: string;
  vehicleId: number;
  deviceId: string;
  driverId: string;
  origin: Coordinates;
  destination: Coordinates;
  category?: string;
  status: TransferStatus;
  vehicleLabel?: string;
  driverName?: string;
  hasActiveAlerts: boolean;
  startedAt?: Date;
  finishedAt?: Date;
  lastPosition?: {
    type: 'Point';
    coordinates: [number, number];
  };
  lastPositionAt?: Date;
};

const transferSchema = new Schema<TransferDocument>(
  {
    _id: { type: Number },
    bookingId: { type: String, required: true },
    vehicleId: { type: Number, required: true },
    deviceId: { type: String, required: true },
    driverId: { type: String, required: true },
    origin: { type: [Number], required: true },
    destination: { type: [Number], required: true },
    category: { type: String, required: false },
    status: {
      type: String,
      enum: Object.values(TransferStatus),
      default: TransferStatus.ASSIGNED,
      required: true,
    },
    vehicleLabel: { type: String, required: false },
    driverName: { type: String, required: false },
    hasActiveAlerts: { type: Boolean, default: false, required: true },
    startedAt: { type: Date, required: false },
    finishedAt: { type: Date, required: false },
    lastPosition: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: { type: [Number] },
    },
    lastPositionAt: { type: Date, required: false },
  },
  { versionKey: false, timestamps: true }
);

transferSchema.index({ status: 1 });
transferSchema.index({ vehicleId: 1 });
transferSchema.index({ driverId: 1 });
transferSchema.index({ category: 1 });
transferSchema.index({ hasActiveAlerts: 1 });
transferSchema.index({ status: 1, hasActiveAlerts: 1 });
transferSchema.index({ lastPosition: '2dsphere' });

export const TransferModel = model<TransferDocument>('Transfer', transferSchema);
