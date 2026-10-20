import { ErrorFactory } from '@move/errors-lib';
import { incrementBusinessEvent, logger } from '@move/logs-lib';
import { Types } from 'mongoose';
import { Booking } from '../../../domain/entities/booking';
import { Item } from '../../../domain/entities/item';
import { BookingCustomerType } from '../../../domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../domain/enums/booking-performance-tier';
import { BookingStatus } from '../../../domain/enums/booking-status';
import type { ItemSize } from '../../../domain/enums/item-size';
import type { IBookingWriteRepository } from '../../../domain/repositories/booking.write.repository';
import type { ICompanyPreregistrationReadRepository } from '../../contracts/company-preregistration.read.repository';
import type { FrequentCompanyClientProvider } from '../../contracts/frequent-company-client.provider';
import type {
  CompanyPreregisteredItemReadDto,
  CompanyPreregisteredLocationReadDto,
} from '../../dtos/company-preregistration-read.dto';
import type { CreateCompanyBookingCommand } from './create-company-booking.command';

export class CreateCompanyBookingHandler {
  constructor(
    private readonly writeRepository: IBookingWriteRepository,
    private readonly preregistrationReadRepository: ICompanyPreregistrationReadRepository,
    private readonly frequentCompanyClientProvider: FrequentCompanyClientProvider,
    private readonly topCompanyPreregistrationReadRepository: ICompanyPreregistrationReadRepository
  ) {}

  async execute(command: CreateCompanyBookingCommand): Promise<string> {
    const startedAt = Date.now();
    this.validate(command);

    const isFrequentCompanyClient = await this.resolveFrequentCompanyClient(command.userId);
    const preregistrationReadRepository = isFrequentCompanyClient
      ? this.topCompanyPreregistrationReadRepository
      : this.preregistrationReadRepository;
    const preregistration = await preregistrationReadRepository.getByCompanyUserId(command.userId);

    if (!preregistration) {
      throw ErrorFactory.badRequest('company preregistration not found');
    }

    const origin = this.findLocation(preregistration.origins, command.originId, 'origin');
    const destination = this.findLocation(
      preregistration.destinations,
      command.destinationId,
      'destination'
    );
    const preregisteredItems = command.items.map((item) =>
      this.findItem(preregistration.items, item.registeredItemId)
    );

    const items = preregisteredItems.map(
      (item) =>
        new Item(
          new Types.ObjectId().toString(),
          item.description,
          item.category,
          item.value,
          item.size as unknown as ItemSize | undefined
        )
    );

    const booking = new Booking(
      new Types.ObjectId().toString(),
      command.userId,
      origin.coordinates,
      destination.coordinates,
      command.date,
      items,
      preregisteredItems[0].category,
      BookingStatus.CLASSIFIED,
      BookingCustomerType.COMPANY,
      isFrequentCompanyClient ? BookingPerformanceTier.TOP_COMPANY : BookingPerformanceTier.COMPANY
    );

    await this.writeRepository.create(booking);
    const durationMs = Date.now() - startedAt;
    incrementBusinessEvent('booking_classification_completed', booking.performanceTier);

    logger.info('Company booking created', {
      bookingId: booking.id,
      userId: command.userId,
      status: BookingStatus.CLASSIFIED,
      itemCount: items.length,
      category: preregisteredItems[0].category,
      customerType: booking.customerType,
      performanceTier: booking.performanceTier,
      classificationDurationMs: durationMs,
    });

    return booking.id;
  }

  private validate(command: CreateCompanyBookingCommand): void {
    if (typeof command.userId !== 'string' || command.userId.trim() === '') {
      throw ErrorFactory.badRequest('userId is required and cannot be empty or whitespace');
    }

    if (typeof command.originId !== 'string' || command.originId.trim() === '') {
      throw ErrorFactory.badRequest('originId is required and cannot be empty or whitespace');
    }

    if (typeof command.destinationId !== 'string' || command.destinationId.trim() === '') {
      throw ErrorFactory.badRequest('destinationId is required and cannot be empty or whitespace');
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

      if (typeof item.registeredItemId !== 'string' || item.registeredItemId.trim() === '') {
        throw ErrorFactory.badRequest(
          'registeredItemId is required and cannot be empty or whitespace'
        );
      }
    });
  }

  private async resolveFrequentCompanyClient(companyUserId: string): Promise<boolean> {
    try {
      return await this.frequentCompanyClientProvider.isFrequentCompanyClient(companyUserId);
    } catch (error) {
      logger.warn('Frequent company client provider failed', {
        companyUserId,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  private findLocation(
    locations: CompanyPreregisteredLocationReadDto[],
    locationId: string,
    locationName: 'origin' | 'destination'
  ): CompanyPreregisteredLocationReadDto {
    const location = locations.find((currentLocation) => currentLocation.id === locationId);

    if (!location) {
      throw ErrorFactory.badRequest(`${locationName} is not preregistered for this company`);
    }

    return location;
  }

  private findItem(
    items: CompanyPreregisteredItemReadDto[],
    registeredItemId: string
  ): CompanyPreregisteredItemReadDto {
    const item = items.find((currentItem) => currentItem.id === registeredItemId);

    if (!item) {
      throw ErrorFactory.badRequest('item is not preregistered for this company');
    }

    return item;
  }
}
