import { logger } from '@move/logs-lib';
import type { IBookingWriteRepository } from '../../../domain/repositories/booking.write.repository';
import type { CategoryCatalogClient } from '../../contracts/category-catalog';
import type { IGeoDistanceClient } from '../../contracts/geo-distance.client';
import type { QuoteBookingResultDto } from '../../dtos/quote-booking-result.dto';
import type { QuoteBookingCommand } from './quote-booking.command';

const SURCHARGE_RULE_TYPE = 'SURCHARGE';

export class QuoteBookingHandler {
  constructor(
    private readonly writeRepository: IBookingWriteRepository,
    private readonly geoDistanceClient: IGeoDistanceClient,
    private readonly categoryCatalogClient: CategoryCatalogClient,
    private readonly config: { baseRatePerKm: number; surchargePercentPerRule: number }
  ) {}

  async execute(command: QuoteBookingCommand): Promise<QuoteBookingResultDto> {
    const booking = await this.writeRepository.getClassified(command.bookingId, command.userId);

    const { distanceKm, degraded } = await this.geoDistanceClient.getDistanceKm(
      booking.origin,
      booking.destination
    );

    const catalog = await this.categoryCatalogClient.getActiveCategories();
    const categoryEntry = catalog.find(
      (c) => c.nameEn === booking.category || c.nameEs === booking.category
    );

    const surchargeRules = (categoryEntry?.rules ?? []).filter(
      (r) => r.type === SURCHARGE_RULE_TYPE
    );
    const surchargePercent = surchargeRules.length * this.config.surchargePercentPerRule;

    const baseCost = distanceKm * this.config.baseRatePerKm;
    const estimatedCost = baseCost * (1 + surchargePercent / 100);

    const roundedCost = Math.round(estimatedCost * 100) / 100;

    await this.writeRepository.setQuote(command.bookingId, command.userId, roundedCost);

    logger.info('Booking quoted', {
      bookingId: command.bookingId,
      distanceKm,
      estimatedCost: roundedCost,
      surchargePercent,
      degraded,
    });

    return {
      bookingId: command.bookingId,
      distanceKm: Math.round(distanceKm * 100) / 100,
      baseCost: Math.round(baseCost * 100) / 100,
      surchargePercent,
      estimatedCost: roundedCost,
      appliedRules: surchargeRules.map((r) => r.type),
      status: 'pending_payment',
      degraded,
    };
  }
}
