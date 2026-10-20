import { model, Schema, type Types } from 'mongoose';
import { ItemSize } from '../../domain/enums/item-size';

export type CompanyPreregisteredLocation = {
  _id: Types.ObjectId;
  coordinates: [number, number];
};

export type CompanyPreregisteredItem = {
  _id: Types.ObjectId;
  description: string;
  category: string;
  value?: string;
  size?: ItemSize;
};

export type CompanyPreregistrationDocument = {
  _id: Types.ObjectId;
  companyUserId: string;
  origins: CompanyPreregisteredLocation[];
  destinations: CompanyPreregisteredLocation[];
  items: CompanyPreregisteredItem[];
};

const locationSchemaDefinition = {
  _id: { type: Schema.Types.ObjectId, required: true },
  coordinates: { type: [Number], required: true },
};

const itemSchemaDefinition = {
  _id: { type: Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  value: { type: String, required: false },
  size: { type: String, required: false, enum: Object.values(ItemSize) },
};

const companyPreregistrationSchema = new Schema<CompanyPreregistrationDocument>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    companyUserId: { type: String, required: true },
    origins: { type: [locationSchemaDefinition], required: true, default: [] },
    destinations: { type: [locationSchemaDefinition], required: true, default: [] },
    items: { type: [itemSchemaDefinition], required: true, default: [] },
  },
  { versionKey: false, timestamps: true }
);

companyPreregistrationSchema.index({ companyUserId: 1 }, { unique: true });

export const CompanyPreregistrationModel = model<CompanyPreregistrationDocument>(
  'CompanyPreregistration',
  companyPreregistrationSchema,
  'company_preregistrations'
);
