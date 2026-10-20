import { Booking } from '../../../src/domain/entities/booking';
import { Item } from '../../../src/domain/entities/item';
import { BookingStatus } from '../../../src/domain/enums/booking-status';
import type { Coordinates } from '../../../src/domain/value-objects/coordinates';

describe('Booking entity', () => {
  const mockId = 'bkg_123';
  const mockUserId = 'usr_123';
  const mockOrigin: Coordinates = [-56.16, -34.9];
  const mockDestination: Coordinates = [-56.03, -34.83];
  const mockDate = '2026-07-10';
  const mockItems = [new Item('itm_123', 'Mesa de madera', 'furniture')];
  const mockCategory = 'furniture';

  it('should create a booking with all fields', () => {
    const booking = new Booking(
      mockId,
      mockUserId,
      mockOrigin,
      mockDestination,
      mockDate,
      mockItems,
      mockCategory,
      BookingStatus.CLASSIFIED
    );

    expect(booking.id).toBe(mockId);
    expect(booking.userId).toBe(mockUserId);
    expect(booking.origin).toBe(mockOrigin);
    expect(booking.destination).toBe(mockDestination);
    expect(booking.date).toBe(mockDate);
    expect(booking.items).toEqual(mockItems);
    expect(booking.category).toBe(mockCategory);
    expect(booking.status).toBe(BookingStatus.CLASSIFIED);
  });
});
