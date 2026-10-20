import { model, Schema, type Types } from 'mongoose';
import type { Coordinates } from '../../domain/value-objects/coordinates';

export type BookingItemSubdocument = {
  size?: string;
};

export type BookingDocument = {
  _id: Types.ObjectId;
  status: string;
  origin: Coordinates;
  destination: Coordinates;
  category?: string;
  items: BookingItemSubdocument[];
};

const bookingItemSchema = new Schema<BookingItemSubdocument>(
  {
    size: { type: String, required: false },
  },
  { _id: false, versionKey: false, strict: false }
);

const bookingSchema = new Schema<BookingDocument>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, required: true },
    origin: { type: [Number], required: true },
    destination: { type: [Number], required: true },
    category: { type: String, required: false },
    items: { type: [bookingItemSchema], default: [] },
  },
  { versionKey: false, timestamps: true, strict: false }
);

export const BookingModel = model<BookingDocument>('Booking', bookingSchema);
