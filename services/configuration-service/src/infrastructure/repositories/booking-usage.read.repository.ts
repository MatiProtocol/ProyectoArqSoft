import type { IBookingUsageReadRepository } from '../../domain/repositories/booking-usage.read.repository';
import { BookingModel } from '../models/booking.model';

export class BookingUsageReadRepository implements IBookingUsageReadRepository {
  async isCategoryUsed(categoryName: string): Promise<boolean> {
    const existing = await BookingModel.exists({
      $or: [{ category: categoryName }, { 'items.category': categoryName }],
    });

    return existing !== null;
  }
}
