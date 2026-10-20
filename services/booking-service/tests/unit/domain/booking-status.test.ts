import { BookingStatus } from '../../../src/domain/enums/booking-status';

describe('BookingStatus enum', () => {
  it('should contain all expected statuses with correct values', () => {
    expect(BookingStatus.PENDING_CLASSIFICATION).toBe('pending_classification');
    expect(BookingStatus.CLASSIFIED).toBe('classified');
    expect(BookingStatus.PENDING_PAYMENT).toBe('pending_payment');
    expect(BookingStatus.PAYED).toBe('payed');
  });

  it('should have exactly 4 statuses', () => {
    const statusCount = Object.keys(BookingStatus).length;
    expect(statusCount).toBe(4);
  });
});
