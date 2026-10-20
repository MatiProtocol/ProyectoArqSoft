import { ErrorFactory } from '@move/errors-lib';
import type { Booking } from '../../../domain/entities/booking';
import { BookingStatus } from '../../../domain/enums/booking-status';
import type {
  IBookingWriteRepository,
  ManualBookingItemClassification,
} from '../../../domain/repositories/booking.write.repository';
import type { AssignedResources } from '../../../domain/value-objects/assigned-resources';
import type { PaymentResult } from '../../../domain/value-objects/payment-result';
import { BookingModel } from '../../models/booking.model';
import { toBooking } from '../mappers/booking-domain.mapper';

export class BookingWriteRepository implements IBookingWriteRepository {
  async create(booking: Booking): Promise<void> {
    const bookingDocument = new BookingModel({
      _id: booking.id,
      userId: booking.userId,
      origin: booking.origin,
      destination: booking.destination,
      date: new Date(booking.date),
      items: booking.items.map((item) => ({
        _id: item.id,
        description: item.description,
        category: item.category,
        value: item.value,
        size: item.size,
      })),
      category: booking.category,
      status: booking.status,
      customerType: booking.customerType,
      performanceTier: booking.performanceTier,
    });

    try {
      await bookingDocument.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw ErrorFactory.conflict('Booking already exists.');
      }
      throw error;
    }
  }

  async classifyManually(
    bookingId: string,
    items: ManualBookingItemClassification[]
  ): Promise<void> {
    const bookingDocument = await BookingModel.findById(bookingId);

    if (!bookingDocument) {
      throw ErrorFactory.notFound('Booking', bookingId);
    }

    if (bookingDocument.status !== BookingStatus.PENDING_CLASSIFICATION) {
      throw ErrorFactory.conflict('Booking is not pending manual classification.');
    }

    const categoryByItemId = new Map(items.map((item) => [item.itemId, item.category]));
    const bookingItemIds = bookingDocument.items.map((item) => item._id.toString());
    const allBookingItemsWereClassified =
      bookingItemIds.length === categoryByItemId.size &&
      bookingItemIds.every((itemId) => categoryByItemId.has(itemId));

    if (!allBookingItemsWereClassified) {
      throw ErrorFactory.badRequest('manual classification must include every booking item');
    }

    bookingDocument.items.forEach((item) => {
      const category = categoryByItemId.get(item._id.toString());

      item.category = category;
    });
    bookingDocument.category = bookingDocument.items[0].category;
    bookingDocument.status = BookingStatus.CLASSIFIED;

    await bookingDocument.save();
  }

  async getPendingClassification(bookingId: string): Promise<Booking> {
    const bookingDocument = await BookingModel.findById(bookingId);

    if (!bookingDocument) {
      throw ErrorFactory.notFound('Booking', bookingId);
    }

    if (bookingDocument.status !== BookingStatus.PENDING_CLASSIFICATION) {
      throw ErrorFactory.conflict('Booking is not pending manual classification.');
    }

    return toBooking(bookingDocument);
  }

  async deletePendingClassification(bookingId: string): Promise<Booking> {
    const deletedBooking = await BookingModel.findOneAndDelete({
      _id: bookingId,
      status: BookingStatus.PENDING_CLASSIFICATION,
    });

    if (deletedBooking) return toBooking(deletedBooking);

    const bookingDocument = await BookingModel.findById(bookingId);

    if (!bookingDocument) {
      throw ErrorFactory.notFound('Booking', bookingId);
    }

    throw ErrorFactory.conflict('Booking is not pending manual classification.');
  }
  async getClassified(bookingId: string, userId: string): Promise<Booking> {
    const bookingDocument = await BookingModel.findOne({
      _id: bookingId,
      userId,
      status: BookingStatus.CLASSIFIED,
    });

    if (!bookingDocument) {
      const exists = await BookingModel.exists({ _id: bookingId });
      if (!exists) throw ErrorFactory.notFound('Booking', bookingId);
      throw ErrorFactory.conflict(
        'Booking is not in classified status or does not belong to user.'
      );
    }

    return toBooking(bookingDocument);
  }

  async setQuote(bookingId: string, userId: string, estimatedCost: number): Promise<void> {
    const result = await BookingModel.updateOne(
      { _id: bookingId, userId, status: BookingStatus.CLASSIFIED },
      { $set: { estimatedCost, status: BookingStatus.PENDING_PAYMENT } }
    );

    if (result.matchedCount === 0) {
      throw ErrorFactory.conflict('Could not update booking quote. State may have changed.');
    }
  }

  async getPayable(bookingId: string, userId: string): Promise<Booking> {
    const bookingDocument = await BookingModel.findOne({
      _id: bookingId,
      userId,
      status: BookingStatus.PENDING_PAYMENT,
    });

    if (!bookingDocument) {
      const exists = await BookingModel.exists({ _id: bookingId });
      if (!exists) throw ErrorFactory.notFound('Booking', bookingId);
      throw ErrorFactory.conflict('Booking is not pending payment or does not belong to user.');
    }

    return toBooking(bookingDocument);
  }

  async markPaid(bookingId: string, userId: string, payment: PaymentResult): Promise<void> {
    const result = await BookingModel.updateOne(
      { _id: bookingId, userId, status: BookingStatus.PENDING_PAYMENT },
      { $set: { payment, status: BookingStatus.PAYED } }
    );

    if (result.matchedCount === 0) {
      throw ErrorFactory.conflict('Could not update booking payment. State may have changed.');
    }
  }

  async recordPayment(bookingId: string, userId: string, payment: PaymentResult): Promise<void> {
    const result = await BookingModel.updateOne(
      { _id: bookingId, userId, status: BookingStatus.PENDING_PAYMENT },
      { $set: { payment } }
    );

    if (result.matchedCount === 0) {
      throw ErrorFactory.conflict('Could not update booking payment. State may have changed.');
    }
  }

  async recordAssignedResources(bookingId: string, resources: AssignedResources): Promise<void> {
    const result = await BookingModel.updateOne(
      { _id: bookingId },
      { $set: { assignedResources: resources } }
    );

    if (result.matchedCount === 0) {
      throw ErrorFactory.notFound('Booking', bookingId);
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorWithCode = error as Error & { code?: unknown };

  return errorWithCode.code === 11000;
}
