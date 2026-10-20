jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
  },
}));

import type { QuoteBookingCommand } from '../../../../../src/application/commands/quote-booking/quote-booking.command';
import { QuoteBookingHandler } from '../../../../../src/application/commands/quote-booking/quote-booking.handler';
import type { CategoryCatalogClient } from '../../../../../src/application/contracts/category-catalog';
import type { IGeoDistanceClient } from '../../../../../src/application/contracts/geo-distance.client';
import { BookingCustomerType } from '../../../../../src/domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../../../src/domain/enums/booking-performance-tier';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';
import type { IBookingWriteRepository } from '../../../../../src/domain/repositories/booking.write.repository';

describe('QuoteBookingHandler', () => {
  let mockWriteRepository: jest.Mocked<IBookingWriteRepository>;
  let mockGeoDistanceClient: jest.Mocked<IGeoDistanceClient>;
  let mockCategoryCatalogClient: jest.Mocked<CategoryCatalogClient>;
  let handler: QuoteBookingHandler;

  const mockConfig = {
    baseRatePerKm: 10,
    surchargePercentPerRule: 20,
  };

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      classifyManually: jest.fn(),
      getPendingClassification: jest.fn(),
      deletePendingClassification: jest.fn(),
      getClassified: jest.fn(),
      setQuote: jest.fn(),
      getPayable: jest.fn(),
      markPaid: jest.fn(),
      recordPayment: jest.fn(),
      recordAssignedResources: jest.fn(),
    };

    mockGeoDistanceClient = {
      getDistanceKm: jest.fn(),
    };

    mockCategoryCatalogClient = {
      getActiveCategories: jest.fn(),
    };

    handler = new QuoteBookingHandler(
      mockWriteRepository,
      mockGeoDistanceClient,
      mockCategoryCatalogClient,
      mockConfig
    );
  });

  it('should quote a booking with base cost and no surcharges', async () => {
    mockWriteRepository.getClassified.mockResolvedValueOnce({
      id: 'booking_123',
      userId: 'user_123',
      origin: [-56.1, -34.9],
      destination: [-56.2, -34.8],
      date: '2099-01-01',
      items: [],
      category: 'Furniture',
      status: BookingStatus.CLASSIFIED,
      customerType: BookingCustomerType.INDIVIDUAL,
      performanceTier: BookingPerformanceTier.INDIVIDUAL,
    });

    mockGeoDistanceClient.getDistanceKm.mockResolvedValueOnce({
      distanceKm: 5.5,
      degraded: false,
    });

    mockCategoryCatalogClient.getActiveCategories.mockResolvedValueOnce([
      { id: 1, nameEn: 'Furniture', nameEs: 'Muebles', rules: [] },
    ]);

    const command: QuoteBookingCommand = { bookingId: 'booking_123', userId: 'user_123' };
    const result = await handler.execute(command);

    expect(mockWriteRepository.getClassified).toHaveBeenCalledWith('booking_123', 'user_123');
    expect(mockWriteRepository.setQuote).toHaveBeenCalledWith('booking_123', 'user_123', 55);

    expect(result).toEqual({
      bookingId: 'booking_123',
      distanceKm: 5.5,
      baseCost: 55,
      surchargePercent: 0,
      estimatedCost: 55,
      appliedRules: [],
      status: 'pending_payment',
      degraded: false,
    });
  });

  it('should quote a booking with surcharges correctly calculated', async () => {
    mockWriteRepository.getClassified.mockResolvedValueOnce({
      id: 'booking_123',
      userId: 'user_123',
      origin: [-56.1, -34.9],
      destination: [-56.2, -34.8],
      date: '2099-01-01',
      items: [],
      category: 'Fragile',
      status: BookingStatus.CLASSIFIED,
      customerType: BookingCustomerType.INDIVIDUAL,
      performanceTier: BookingPerformanceTier.INDIVIDUAL,
    });

    mockGeoDistanceClient.getDistanceKm.mockResolvedValueOnce({
      distanceKm: 12.345,
      degraded: true,
    });

    mockCategoryCatalogClient.getActiveCategories.mockResolvedValueOnce([
      {
        id: 2,
        nameEn: 'Fragile',
        nameEs: 'Fragil',
        rules: [
          { id: 1, type: 'SURCHARGE' },
          { id: 2, type: 'WARNING' },
          { id: 3, type: 'SURCHARGE' },
        ],
      },
    ]);

    const command: QuoteBookingCommand = { bookingId: 'booking_123', userId: 'user_123' };
    const result = await handler.execute(command);

    expect(mockWriteRepository.setQuote).toHaveBeenCalledWith('booking_123', 'user_123', 172.83);

    expect(result).toEqual({
      bookingId: 'booking_123',
      distanceKm: 12.35,
      baseCost: 123.45,
      surchargePercent: 40,
      estimatedCost: 172.83,
      appliedRules: ['SURCHARGE', 'SURCHARGE'],
      status: 'pending_payment',
      degraded: true,
    });
  });

  it('should handle category not found in catalog without surcharges', async () => {
    mockWriteRepository.getClassified.mockResolvedValueOnce({
      id: 'booking_123',
      userId: 'user_123',
      origin: [-56.1, -34.9],
      destination: [-56.2, -34.8],
      date: '2099-01-01',
      items: [],
      category: 'Unknown',
      status: BookingStatus.CLASSIFIED,
      customerType: BookingCustomerType.INDIVIDUAL,
      performanceTier: BookingPerformanceTier.INDIVIDUAL,
    });

    mockGeoDistanceClient.getDistanceKm.mockResolvedValueOnce({
      distanceKm: 10,
      degraded: false,
    });

    mockCategoryCatalogClient.getActiveCategories.mockResolvedValueOnce([
      { id: 1, nameEn: 'Furniture', nameEs: 'Muebles', rules: [] },
    ]);

    const command: QuoteBookingCommand = { bookingId: 'booking_123', userId: 'user_123' };
    const result = await handler.execute(command);

    expect(result.estimatedCost).toBe(100);
    expect(result.surchargePercent).toBe(0);
  });
});
