import { model, Schema } from 'mongoose';
import { ZoneType } from '../../domain/enums/zone-type';

export type ZoneDocument = {
  _id: number;
  name: string;
  type: ZoneType;
  polygon: {
    type: 'Polygon';
    coordinates: number[][][];
  };
};

const zoneSchema = new Schema<ZoneDocument>(
  {
    _id: { type: Number },
    name: { type: String, required: true, unique: true },
    type: { type: String, enum: Object.values(ZoneType), required: true },
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
      },
      coordinates: { type: [[[Number]]], required: true },
    },
  },
  { timestamps: true, versionKey: false }
);

zoneSchema.index({ polygon: '2dsphere' });
zoneSchema.index({ type: 1 });

export const ZoneModel = model<ZoneDocument>('Zone', zoneSchema);
