import type { IBookingReadRepository } from '../../contracts/booking.read.repository';
import type { BookingReadDto } from '../../dtos/booking-read.dto';
import type { ListCustomerBookingsQuery } from './list-customer-bookings.query';

export class ListCustomerBookingsHandler {
  constructor(private readonly bookingReadRepository: IBookingReadRepository) {}

  async execute(query: ListCustomerBookingsQuery): Promise<BookingReadDto[]> {
    return this.bookingReadRepository.getAll({
      userId: query.userId,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
      skip: query.skip,
    });
  }
}
