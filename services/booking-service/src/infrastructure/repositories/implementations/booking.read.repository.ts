import type {
  BookingFilter,
  IBookingReadRepository,
} from '../../../application/contracts/booking.read.repository';
import type { BookingReadDto } from '../../../application/dtos/booking-read.dto';
import { BookingModel } from '../../models/booking.model';
import { toBookingReadDto } from '../mappers/booking-read.mapper';

type BookingQuery = {
  userId?: string;
  status?: BookingFilter['status'];
  category?: string;
  date?: {
    $gte?: Date;
    $lte?: Date;
  };
};

const DEFAULT_LIMIT = 20;
const DEFAULT_SKIP = 0;

export class BookingReadRepository implements IBookingReadRepository {
  async getAll(filter: BookingFilter): Promise<BookingReadDto[]> {
    const query = this.buildQuery(filter);
    const limit = this.getLimit(filter);
    const skip = filter.skip ?? DEFAULT_SKIP;

    const bookingDocuments = await BookingModel.find(query)
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return bookingDocuments.map((booking) => toBookingReadDto(booking));
  }

  private buildQuery(filter: BookingFilter): BookingQuery {
    const query: BookingQuery = {};

    if (filter.userId) query.userId = filter.userId;

    if (filter.status) query.status = filter.status;

    if (filter.category) query.category = filter.category;

    const dateFilter = this.buildDateFilter(filter);
    if (dateFilter) query.date = dateFilter;

    return query;
  }

  private getLimit(filter: BookingFilter): number {
    if (!filter.limit) return DEFAULT_LIMIT;

    return filter.limit;
  }

  private buildDateFilter(filter: BookingFilter): BookingQuery['date'] {
    const dateFilter: BookingQuery['date'] = {};

    if (filter.dateFrom) dateFilter.$gte = filter.dateFrom;

    if (filter.dateTo) dateFilter.$lte = filter.dateTo;

    if (!dateFilter.$gte && !dateFilter.$lte) return undefined;

    return dateFilter;
  }
}
