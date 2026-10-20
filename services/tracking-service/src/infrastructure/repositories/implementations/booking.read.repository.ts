import type {
  BookingInfo,
  IBookingReadRepository,
} from '../../../application/contracts/booking.read.repository';
import { BookingModel } from '../../models/booking.model';

export class BookingReadRepository implements IBookingReadRepository {
  async findById(id: string): Promise<BookingInfo | null> {
    if (!isValidObjectId(id)) return null;

    const booking = await BookingModel.findById(id).lean();
    if (!booking) return null;

    return {
      id: booking._id.toString(),
      status: booking.status,
      origin: booking.origin,
      destination: booking.destination,
      category: booking.category,
      items: (booking.items ?? []).map((item) => ({ size: item.size })),
    };
  }
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}
