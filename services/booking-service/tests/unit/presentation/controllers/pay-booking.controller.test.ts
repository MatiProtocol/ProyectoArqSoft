import { ErrorFactory } from '@move/errors-lib';
import type { Request, Response } from 'express';
import type { PayBookingHandler } from '../../../../src/application/commands/pay-booking/pay-booking.handler';
import { PayBookingController } from '../../../../src/presentation/controllers/pay-booking.controller';

describe('PayBookingController', () => {
  let mockHandler: jest.Mocked<PayBookingHandler>;
  let controller: PayBookingController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<PayBookingHandler>;

    controller = new PayBookingController(mockHandler);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      params: {},
      body: {},
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

  it('should call the handler and return 200 when the payment is processed synchronously', async () => {
    req.params = { bookingId: 'booking_123' };
    req.body = { methodToken: 'tok_visa' };

    const mockResult = {
      bookingId: 'booking_123',
      bookingStatus: 'payed',
      payment: { status: 'accepted', amount: 150, reference: 'ref_1' },
      retryQueued: false,
    };

    mockHandler.execute.mockResolvedValueOnce(mockResult);

    await controller.pay(req as Request, res as Response);

    expect(mockHandler.execute).toHaveBeenCalledWith({
      bookingId: 'booking_123',
      userId: 'user_123',
      methodToken: 'tok_visa',
      simulateOutcome: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(mockResult);
  });

  it('should return 202 when the payment was queued for retry', async () => {
    req.params = { bookingId: 'booking_123' };
    req.body = { methodToken: 'tok_visa', simulateOutcome: 'outage' };

    const mockResult = {
      bookingId: 'booking_123',
      bookingStatus: 'pending_payment',
      payment: { status: 'pending', amount: 150, reason: 'outage' },
      retryQueued: true,
    };

    mockHandler.execute.mockResolvedValueOnce(mockResult);

    await controller.pay(req as Request, res as Response);

    expect(mockHandler.execute).toHaveBeenCalledWith({
      bookingId: 'booking_123',
      userId: 'user_123',
      methodToken: 'tok_visa',
      simulateOutcome: 'outage',
    });
    expect(res.status).toHaveBeenCalledWith(202);
    expect(jsonMock).toHaveBeenCalledWith(mockResult);
  });

  it('should throw badRequest if bookingId is missing', async () => {
    req.params = {};

    await expect(controller.pay(req as Request, res as Response)).rejects.toEqual(
      ErrorFactory.badRequest('bookingId is required')
    );
    expect(mockHandler.execute).not.toHaveBeenCalled();
  });

  it('should throw badRequest if bookingId is empty or whitespace', async () => {
    req.params = { bookingId: '   ' };

    await expect(controller.pay(req as Request, res as Response)).rejects.toEqual(
      ErrorFactory.badRequest('bookingId is required')
    );
    expect(mockHandler.execute).not.toHaveBeenCalled();
  });

  it('should handle a missing body gracefully', async () => {
    req.params = { bookingId: 'booking_123' };
    req.body = undefined;

    const mockResult = {
      bookingId: 'booking_123',
      bookingStatus: 'pending_payment',
      payment: { status: 'rejected', amount: 150 },
      retryQueued: false,
    };
    mockHandler.execute.mockResolvedValueOnce(mockResult);

    await controller.pay(req as Request, res as Response);

    expect(mockHandler.execute).toHaveBeenCalledWith({
      bookingId: 'booking_123',
      userId: 'user_123',
      methodToken: undefined,
      simulateOutcome: undefined,
    });
  });
});
