import { ErrorFactory } from '@move/errors-lib';
import type { Request, Response } from 'express';
import type { QuoteBookingHandler } from '../../../../src/application/commands/quote-booking/quote-booking.handler';
import { QuoteBookingController } from '../../../../src/presentation/controllers/quote-booking.controller';

describe('QuoteBookingController', () => {
  let mockHandler: jest.Mocked<QuoteBookingHandler>;
  let controller: QuoteBookingController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<QuoteBookingHandler>;

    controller = new QuoteBookingController(mockHandler);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      params: {},
      user: {
        id: 'user_123',
        roles: [],
      },
    } as unknown as Partial<Request>;

    res = {
      status: statusMock,
      json: jsonMock,
    } as Partial<Response>;
  });

  it('should call handler and return 200 with result', async () => {
    req.params = { bookingId: 'booking_123' };

    const mockResult = {
      bookingId: 'booking_123',
      distanceKm: 5,
      baseCost: 50,
      surchargePercent: 0,
      estimatedCost: 50,
      appliedRules: [],
      status: 'pending_payment',
      degraded: false,
    };

    mockHandler.execute.mockResolvedValueOnce(mockResult);

    await controller.quote(req as Request, res as Response);

    expect(mockHandler.execute).toHaveBeenCalledWith({
      bookingId: 'booking_123',
      userId: 'user_123',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(mockResult);
  });

  it('should throw badRequest if bookingId is missing', async () => {
    req.params = {};

    await expect(controller.quote(req as Request, res as Response)).rejects.toEqual(
      ErrorFactory.badRequest('bookingId is required')
    );
    expect(mockHandler.execute).not.toHaveBeenCalled();
  });

  it('should throw badRequest if bookingId is empty or whitespace', async () => {
    req.params = { bookingId: '   ' };

    await expect(controller.quote(req as Request, res as Response)).rejects.toEqual(
      ErrorFactory.badRequest('bookingId is required')
    );
    expect(mockHandler.execute).not.toHaveBeenCalled();
  });
});
