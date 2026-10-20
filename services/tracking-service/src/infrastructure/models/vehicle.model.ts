import { model, Schema } from 'mongoose';

export type VehicleDocument = {
  _id: number;
  licensePlate: string;
  capacity: number;
  available: boolean;
  deviceId?: string;
};

const vehicleSchema = new Schema<VehicleDocument>(
  {
    _id: { type: Number },
    licensePlate: { type: String, required: true },
    capacity: { type: Number, required: true },
    available: { type: Boolean, default: true },
    deviceId: { type: String },
  },
  { timestamps: true, versionKey: false }
);

export const VehicleModel = model<VehicleDocument>('Vehicle', vehicleSchema);
