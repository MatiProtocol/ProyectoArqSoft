import { model, Schema, type Types } from 'mongoose';
import { BookingCustomerType } from '../../domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../domain/enums/booking-performance-tier';
import { BookingStatus } from '../../domain/enums/booking-status';
import { ItemSize } from '../../domain/enums/item-size';
import { PaymentStatus } from '../../domain/enums/payment-status';
import type { AssignedResources } from '../../domain/value-objects/assigned-resources';
import type { PaymentResult } from '../../domain/value-objects/payment-result';

export type BookingItemDocument = {
  _id: Types.ObjectId;
  description: string;
  category?: string;
  value?: string;
  size?: ItemSize;
};

export type BookingDocument = {
  _id: Types.ObjectId;
  userId: string;
  origin: [number, number];
  destination: [number, number];
  date: Date;
  items: BookingItemDocument[];
  category?: string;
  status: BookingStatus;
  customerType: BookingCustomerType;
  performanceTier: BookingPerformanceTier;
  estimatedCost?: number;
  payment?: PaymentResult;
  assignedResources?: AssignedResources;
  createdAt?: Date;
  updatedAt?: Date;
};

const paymentSchema = new Schema<PaymentResult>(
  {
    status: { type: String, required: true, enum: Object.values(PaymentStatus) },
    amount: { type: Number, required: true },
    provider: { type: String, required: true },
    reference: { type: String, required: false },
    reason: { type: String, required: false },
    attempts: { type: Number, required: true, default: 0 },
    paidAt: { type: String, required: false },
    updatedAt: { type: String, required: true },
  },
  { _id: false, versionKey: false }
);

const bookingItemSchema = new Schema<BookingItemDocument>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    description: { type: String, required: true },
    category: { type: String, required: false },
    value: { type: String, required: false },
    size: { type: String, required: false, enum: Object.values(ItemSize), default: ItemSize.SMALL },
  },
  { _id: false, versionKey: false }
);

const assignedResourcesSchema = new Schema<AssignedResources>(
  {
    transferId: { type: Number, required: true },
    vehicleId: { type: Number, required: true },
    deviceId: { type: String, required: true },
    driverId: { type: String, required: true },
    vehicleLabel: { type: String, required: false },
    driverName: { type: String, required: false },
    status: { type: String, required: true, enum: ['assigned'] },
    assignedAt: { type: String, required: true },
  },
  { _id: false, versionKey: false }
);

const bookingSchema = new Schema<BookingDocument>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    origin: { type: [Number], required: true },
    destination: { type: [Number], required: true },
    date: { type: Date, required: true },
    items: { type: [bookingItemSchema], required: true, default: [] },
    category: { type: String, required: false },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING_CLASSIFICATION,
      required: true,
    },
    customerType: {
      type: String,
      enum: Object.values(BookingCustomerType),
      default: BookingCustomerType.INDIVIDUAL,
      required: true,
    },
    performanceTier: {
      type: String,
      enum: Object.values(BookingPerformanceTier),
      default: BookingPerformanceTier.INDIVIDUAL,
      required: true,
    },
    estimatedCost: { type: Number, required: false },
    payment: { type: paymentSchema, required: false },
    assignedResources: { type: assignedResourcesSchema, required: false },
  },
  { versionKey: false, timestamps: true }
);

bookingSchema.index({ userId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ category: 1 });
bookingSchema.index({ 'items.category': 1 });
bookingSchema.index({ 'items.size': 1 });
bookingSchema.index({ customerType: 1, createdAt: -1, userId: 1 });
bookingSchema.index({ userId: 1, date: 1, status: 1 });

export const BookingModel = model<BookingDocument>('Booking', bookingSchema);
