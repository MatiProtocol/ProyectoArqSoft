import type { BookingStatus } from '../../domain/enums/booking-status';
import type { BookingReadDto } from '../dtos/booking-read.dto';

export type BookingFilter = {
  userId?: string;
  status?: BookingStatus;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  skip?: number;
};

export interface IBookingReadRepository {
  getAll(filter: BookingFilter): Promise<BookingReadDto[]>;
}
