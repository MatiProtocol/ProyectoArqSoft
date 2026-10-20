import { ListCustomerBookingsQuery } from '../../../../../src/application/queries/list-customer-bookings/list-customer-bookings.query';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';

describe('ListCustomerBookingsQuery', () => {
  it('builds a query from valid filters', () => {
    const query = ListCustomerBookingsQuery.fromQueryParams(' user_123 ', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      status: BookingStatus.PAYED,
      limit: '10',
      skip: '5',
    });

    expect(query).toMatchObject({
      userId: 'user_123',
      status: BookingStatus.PAYED,
      limit: 10,
      skip: 5,
    });
    expect(query.dateFrom?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(query.dateTo?.toISOString()).toBe('2026-07-31T00:00:00.000Z');
  });

  it('uses defaults when optional filters are omitted', () => {
    const query = ListCustomerBookingsQuery.fromQueryParams('user_123', {});

    expect(query.limit).toBe(20);
    expect(query.skip).toBe(0);
    expect(query.status).toBeUndefined();
  });

  it('rejects an invalid status', () => {
    expect(() =>
      ListCustomerBookingsQuery.fromQueryParams('user_123', { status: 'invalid' })
    ).toThrow('status must be valid');
  });

  it('rejects an inverted date range', () => {
    expect(() =>
      ListCustomerBookingsQuery.fromQueryParams('user_123', {
        dateFrom: '2026-08-01',
        dateTo: '2026-07-01',
      })
    ).toThrow('dateFrom must be before or equal to dateTo');
  });
});
