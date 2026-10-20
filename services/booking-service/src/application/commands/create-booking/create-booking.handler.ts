import { ErrorFactory } from '@move/errors-lib';
import { incrementBusinessEvent, logger } from '@move/logs-lib';
import { Types } from 'mongoose';
import { Booking } from '../../../domain/entities/booking';
import { Item } from '../../../domain/entities/item';
import { BookingCustomerType } from '../../../domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../domain/enums/booking-performance-tier';
import { BookingStatus } from '../../../domain/enums/booking-status';
import { ItemSize } from '../../../domain/enums/item-size';
import type { IBookingWriteRepository } from '../../../domain/repositories/booking.write.repository';
import { isValidCoordinates } from '../../../domain/value-objects/coordinates';
import type { ItemClassificationResult, ItemClassifier } from '../../contracts/item-classifier';
import type { PendingClassificationNotification } from '../../contracts/operator-notifier';
import type { PendingClassificationPublisher } from '../../contracts/pending-classification.publisher';
import type { CreateBookingCommand } from './create-booking.command';

export class CreateBookingHandler {
  constructor(
    private readonly writeRepository: IBookingWriteRepository,
    private readonly itemClassifier: ItemClassifier,
    private readonly pendingClassificationPublisher: PendingClassificationPublisher
  ) {}

  async execute(command: CreateBookingCommand): Promise<string> {
    const startedAt = Date.now();
    this.validate(command);

    const classification = await this.classify(command);
    const isClassified = classification.recognized;

    const categoryByIndex = this.toCategoryByIndex(classification);
    const items = command.items.map((item, index) => {
      const itemCategory = isClassified ? categoryByIndex.get(index) : undefined;

      return new Item(
        new Types.ObjectId().toString(),
        item.description,
        itemCategory,
        item.value,
        item.size
      );
    });

    const bookingId = new Types.ObjectId().toString();
    const bookingCategory = isClassified ? classification.items[0].category : undefined;
    const bookingStatus = isClassified
      ? BookingStatus.CLASSIFIED
      : BookingStatus.PENDING_CLASSIFICATION;

    const booking = new Booking(
      bookingId,
      command.userId,
      command.origin,
      command.destination,
      command.date,
      items,
      bookingCategory,
      bookingStatus,
      BookingCustomerType.INDIVIDUAL,
      BookingPerformanceTier.INDIVIDUAL
    );

    await this.writeRepository.create(booking);
    const durationMs = Date.now() - startedAt;
    incrementBusinessEvent('booking_classification_completed', booking.performanceTier);

    logger.info('Booking created', {
      bookingId,
      userId: command.userId,
      status: bookingStatus,
      itemCount: items.length,
      category: bookingCategory,
      customerType: booking.customerType,
      performanceTier: booking.performanceTier,
      classificationDurationMs: durationMs,
    });

    if (!isClassified) {
      void this.pendingClassificationPublisher
        .publishPendingClassification(this.toPendingClassificationNotification(booking))
        .catch((error: unknown) => {
          logger.warn('Pending classification notification could not be queued', {
            bookingId,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }

    return bookingId;
  }

  private validate(command: CreateBookingCommand): void {
    if (typeof command.userId !== 'string' || command.userId.trim() === '') {
      throw ErrorFactory.badRequest('userId is required and cannot be empty or whitespace');
    }

    if (!isValidCoordinates(command.origin)) {
      throw ErrorFactory.badRequest('origin must be [lng, lat] within valid ranges');
    }

    if (!isValidCoordinates(command.destination)) {
      throw ErrorFactory.badRequest('destination must be [lng, lat] within valid ranges');
    }

    if (typeof command.date !== 'string') {
      throw ErrorFactory.badRequest('date must be a valid date');
    }

    const bookingDate = new Date(command.date);
    if (Number.isNaN(bookingDate.getTime())) {
      throw ErrorFactory.badRequest('date must be a valid date');
    }

    if (bookingDate <= new Date()) {
      throw ErrorFactory.badRequest('date must be in the future');
    }

    if (!Array.isArray(command.items) || command.items.length === 0) {
      throw ErrorFactory.badRequest('at least one item is required');
    }

    command.items.forEach((item) => {
      if (!item || typeof item !== 'object') {
        throw ErrorFactory.badRequest('item must be an object');
      }

      if (typeof item.description !== 'string' || item.description.trim() === '') {
        throw ErrorFactory.badRequest(
          'item description is required and cannot be empty or whitespace'
        );
      }

      if (item.value !== undefined && typeof item.value !== 'string') {
        throw ErrorFactory.badRequest('item value must be a string');
      }

      if (item.size !== undefined && !Object.values(ItemSize).includes(item.size)) {
        throw ErrorFactory.badRequest('item size is invalid');
      }
    });
  }

  private async classify(command: CreateBookingCommand): Promise<ItemClassificationResult> {
    try {
      return await this.itemClassifier.classify(command.items);
    } catch (error) {
      logger.warn('Item classification failed, booking will require manual classification', {
        userId: command.userId,
        itemCount: command.items.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return { recognized: false, items: [] };
    }
  }

  private toCategoryByIndex(classification: ItemClassificationResult): Map<number, string> {
    return new Map(
      classification.items.map((item) => [item.index, item.category] as [number, string])
    );
  }

  private toPendingClassificationNotification(booking: Booking): PendingClassificationNotification {
    return {
      bookingId: booking.id,
      userId: booking.userId,
      origin: booking.origin,
      destination: booking.destination,
      date: booking.date,
      status: BookingStatus.PENDING_CLASSIFICATION,
      items: booking.items.map((item) => ({
        id: item.id,
        description: item.description,
        value: item.value,
        size: item.size,
      })),
    };
  }
}
