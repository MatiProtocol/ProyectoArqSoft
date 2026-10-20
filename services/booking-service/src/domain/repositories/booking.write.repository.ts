import type { Booking } from '../entities/booking';
import type { AssignedResources } from '../value-objects/assigned-resources';
import type { PaymentResult } from '../value-objects/payment-result';

export type ManualBookingItemClassification = {
  itemId: string;
  category: string;
};

export interface IBookingWriteRepository {
  create(booking: Booking): Promise<void>;
  classifyManually(bookingId: string, items: ManualBookingItemClassification[]): Promise<void>;
  getPendingClassification(bookingId: string): Promise<Booking>;
  deletePendingClassification(bookingId: string): Promise<Booking>;
  getClassified(bookingId: string, userId: string): Promise<Booking>;
  setQuote(bookingId: string, userId: string, estimatedCost: number): Promise<void>;
  getPayable(bookingId: string, userId: string): Promise<Booking>;
  markPaid(bookingId: string, userId: string, payment: PaymentResult): Promise<void>;
  recordPayment(bookingId: string, userId: string, payment: PaymentResult): Promise<void>;
  recordAssignedResources(bookingId: string, resources: AssignedResources): Promise<void>;
}
