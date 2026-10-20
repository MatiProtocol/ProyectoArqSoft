import { model, Schema, type Types } from 'mongoose';

export type BookingUsageDocument = {
  _id: Types.ObjectId;
  category?: string;
  items: { category?: string }[];
};

const bookingItemSchema = new Schema<{ category?: string }>(
  { category: { type: String, required: false } },
  { _id: false, versionKey: false, strict: false }
);

const bookingSchema = new Schema<BookingUsageDocument>(
  {
    category: { type: String, required: false },
    items: { type: [bookingItemSchema], default: [] },
  },
  { versionKey: false, strict: false }
);

export const BookingModel = model<BookingUsageDocument>('Booking', bookingSchema);
