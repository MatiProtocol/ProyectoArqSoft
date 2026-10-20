import type { Booking } from '../../../domain/entities/booking';
import { Item } from '../../../domain/entities/item';
import { BookingCustomerType } from '../../../domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../domain/enums/booking-performance-tier';
import type { BookingDocument } from '../../models/booking.model';

export function toBooking(bookingDocument: BookingDocument): Booking {
  return {
    id: bookingDocument._id.toString(),
    userId: bookingDocument.userId,
    origin: bookingDocument.origin,
    destination: bookingDocument.destination,
    date: bookingDocument.date.toISOString(),
    items: bookingDocument.items.map(
      (item) =>
        new Item(item._id.toString(), item.description, item.category, item.value, item.size)
    ),
    category: bookingDocument.category,
    status: bookingDocument.status,
    customerType: bookingDocument.customerType ?? BookingCustomerType.INDIVIDUAL,
    performanceTier: bookingDocument.performanceTier ?? BookingPerformanceTier.INDIVIDUAL,
    estimatedCost: bookingDocument.estimatedCost,
    payment: bookingDocument.payment,
    assignedResources: bookingDocument.assignedResources,
  };
}
