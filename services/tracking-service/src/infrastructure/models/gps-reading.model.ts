import { model, Schema, type Types } from 'mongoose';

const READING_TTL_SECONDS = 7 * 24 * 3600;

export type GpsReadingDocument = {
  _id: Types.ObjectId;
  transferId: number;
  vehicleId: number;
  deviceId: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  timestamp: Date;
  receivedAt: Date;
};

const gpsReadingSchema = new Schema<GpsReadingDocument>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    transferId: { type: Number, required: true },
    vehicleId: { type: Number, required: true },
    deviceId: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: { type: [Number], required: true },
    },
    timestamp: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false }
);

gpsReadingSchema.index({ transferId: 1, timestamp: -1 });
gpsReadingSchema.index({ vehicleId: 1 });
gpsReadingSchema.index({ location: '2dsphere' });
gpsReadingSchema.index({ receivedAt: 1 }, { expireAfterSeconds: READING_TTL_SECONDS });

export const GpsReadingModel = model<GpsReadingDocument>('GpsReading', gpsReadingSchema);
