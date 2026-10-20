import type { Request, Response } from 'express';
import type { ListCustomerBookingsHandler } from '../../../../src/application/queries/list-customer-bookings/list-customer-bookings.handler';
import { ListCustomerBookingsController } from '../../../../src/presentation/controllers/list-customer-bookings.controller';

describe('ListCustomerBookingsController', () => {
  it('returns the current customer bookings', async () => {
    const handler: jest.Mocked<ListCustomerBookingsHandler> = {
      execute: jest.fn().mockResolvedValue([{ id: 'booking_1' }]),
    } as never;
    const controller = new ListCustomerBookingsController(handler);
    const req = {
      user: { id: 'user_123' },
      query: { status: 'payed' },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    await controller.list(req, res);

    expect(handler.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_123', status: 'payed' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 'booking_1' }]);
  });
});
