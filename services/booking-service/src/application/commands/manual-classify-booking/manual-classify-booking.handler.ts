import { ErrorFactory } from '@move/errors-lib';
import { logger } from '@move/logs-lib';
import { Types } from 'mongoose';
import { BookingStatus } from '../../../domain/enums/booking-status';
import type { IBookingWriteRepository } from '../../../domain/repositories/booking.write.repository';
import type { CategoryCatalogClient, CategoryCatalogItem } from '../../contracts/category-catalog';
import type { ManualClassificationQueue } from '../../contracts/manual-classification-queue';
import type { ManualClassifyBookingCommand } from './manual-classify-booking.command';

export class ManualClassifyBookingHandler {
  constructor(
    private readonly writeRepository: IBookingWriteRepository,
    private readonly categoryCatalogClient: CategoryCatalogClient,
    private readonly manualClassificationQueue: ManualClassificationQueue
  ) {}

  async execute(command: ManualClassifyBookingCommand): Promise<void> {
    this.validate(command);

    const bookingId = command.bookingId.trim();
    const operatorUserId = command.operatorUserId.trim();

    await this.manualClassificationQueue.ensureClaimedBy(bookingId, operatorUserId);

    const canonicalCategoryByName = await this.getCanonicalCategoryByName();
    const items = command.items.map((item) => {
      const category = canonicalCategoryByName.get(this.normalizeCategory(item.category));

      if (!category) {
        logger.warn('Manual classification rejected because category is not in MOVE catalog', {
          bookingId,
          operatorUserId,
          itemId: item.itemId.trim(),
          category: item.category,
        });
        throw ErrorFactory.badRequest('category is not a valid MOVE category');
      }

      return {
        itemId: item.itemId.trim(),
        category,
      };
    });

    await this.writeRepository.classifyManually(bookingId, items);
    await this.manualClassificationQueue.complete(bookingId, operatorUserId);

    logger.info('Booking manually classified', {
      bookingId,
      operatorUserId,
      status: BookingStatus.CLASSIFIED,
      itemCount: items.length,
      category: items[0].category,
    });
  }

  private validate(command: ManualClassifyBookingCommand): void {
    if (
      typeof command.bookingId !== 'string' ||
      command.bookingId.trim() === '' ||
      !Types.ObjectId.isValid(command.bookingId.trim())
    ) {
      throw ErrorFactory.badRequest('bookingId must be a valid id');
    }

    if (typeof command.operatorUserId !== 'string' || command.operatorUserId.trim() === '') {
      throw ErrorFactory.badRequest('operatorUserId is required and cannot be empty or whitespace');
    }

    if (!Array.isArray(command.items) || command.items.length === 0) {
      throw ErrorFactory.badRequest('at least one classified item is required');
    }

    const itemIds = new Set<string>();

    command.items.forEach((item) => {
      if (!item || typeof item !== 'object') {
        throw ErrorFactory.badRequest('classified item must be an object');
      }

      if (
        typeof item.itemId !== 'string' ||
        item.itemId.trim() === '' ||
        !Types.ObjectId.isValid(item.itemId.trim())
      ) {
        throw ErrorFactory.badRequest('itemId must be a valid id');
      }

      const itemId = item.itemId.trim();
      if (itemIds.has(itemId)) {
        throw ErrorFactory.badRequest('itemId cannot be duplicated');
      }
      itemIds.add(itemId);

      if (typeof item.category !== 'string' || item.category.trim() === '') {
        throw ErrorFactory.badRequest('category is required and cannot be empty or whitespace');
      }
    });
  }

  private async getCanonicalCategoryByName(): Promise<Map<string, string>> {
    const categories = await this.categoryCatalogClient.getActiveCategories();

    if (categories.length === 0) {
      throw ErrorFactory.badRequest('no active MOVE categories are available');
    }

    const canonicalCategoryByName = new Map<string, string>();

    categories.forEach((category) => {
      this.addCategoryAlias(canonicalCategoryByName, category, category.nameEn);
      this.addCategoryAlias(canonicalCategoryByName, category, category.nameEs);
    });

    return canonicalCategoryByName;
  }

  private addCategoryAlias(
    canonicalCategoryByName: Map<string, string>,
    category: CategoryCatalogItem,
    alias: string
  ): void {
    canonicalCategoryByName.set(this.normalizeCategory(alias), category.nameEn);
  }

  private normalizeCategory(category: string): string {
    return category.trim().toLowerCase();
  }
}
