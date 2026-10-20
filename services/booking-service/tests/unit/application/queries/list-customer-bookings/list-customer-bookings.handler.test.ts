import type { IBookingReadRepository } from '../../../../../src/application/contracts/booking.read.repository';
import { ListCustomerBookingsHandler } from '../../../../../src/application/queries/list-customer-bookings/list-customer-bookings.handler';
import { ListCustomerBookingsQuery } from '../../../../../src/application/queries/list-customer-bookings/list-customer-bookings.query';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';

describe('ListCustomerBookingsHandler', () => {
  it('delegates to the read repository with customer filters', async () => {
    const repository: jest.Mocked<IBookingReadRepository> = { getAll: jest.fn() };
    repository.getAll.mockResolvedValueOnce([]);
    const handler = new ListCustomerBookingsHandler(repository);
    const dateFrom = new Date('2026-07-01');
    const dateTo = new Date('2026-07-31');

    await handler.execute(
      new ListCustomerBookingsQuery('user_123', dateFrom, dateTo, BookingStatus.PAYED, 10, 5)
    );

    expect(repository.getAll).toHaveBeenCalledWith({
      userId: 'user_123',
      status: BookingStatus.PAYED,
      dateFrom,
      dateTo,
      limit: 10,
      skip: 5,
    });
  });
});
