import type { BookingReadDto } from '../../../application/dtos/booking-read.dto';
import type { BookingStatusDto } from '../../../application/dtos/enums/booking-status.dto';
import type { ItemSizeDto } from '../../../application/dtos/enums/item-size.dto';
import type { ItemReadDto } from '../../../application/dtos/item-read.dto';
import type { BookingDocument, BookingItemDocument } from '../../models/booking.model';

export function toBookingReadDto(booking: BookingDocument): BookingReadDto {
  const bookingId = booking._id.toString();

  return {
    id: bookingId,
    userId: booking.userId,
    origin: booking.origin,
    destination: booking.destination,
    date: booking.date.toISOString(),
    items: booking.items.map((item) => toItemReadDto(item)),
    category: booking.category,
    status: booking.status as unknown as BookingStatusDto,
    estimatedCost: booking.estimatedCost,
    payment: booking.payment,
    assignedResources: booking.assignedResources,
  };
}

export function toItemReadDto(item: BookingItemDocument): ItemReadDto {
  return {
    id: item._id.toString(),
    description: item.description,
    category: item.category,
    value: item.value,
    size: item.size as unknown as ItemSizeDto,
  };
}
