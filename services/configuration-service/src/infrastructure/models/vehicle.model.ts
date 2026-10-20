import { model, Schema } from 'mongoose';
import { VehicleType } from '../../domain/enums/vehicle-type';

export type VehicleDocument = {
  _id: number;
  licensePlate: string;
  type: VehicleType;
  capacity: number;
  available: boolean;
  deviceId?: string;
  characteristics?: Record<string, unknown>;
};

const vehicleSchema = new Schema<VehicleDocument>(
  {
    _id: { type: Number },
    licensePlate: { type: String, required: true, unique: true },
    type: { type: String, enum: Object.values(VehicleType), required: true },
    capacity: { type: Number, required: true, min: 1 },
    available: { type: Boolean, default: true },
    deviceId: { type: String, unique: true, sparse: true },
    characteristics: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

vehicleSchema.index({ available: 1 });
vehicleSchema.index({ type: 1 });

export const VehicleModel = model<VehicleDocument>('Vehicle', vehicleSchema);
