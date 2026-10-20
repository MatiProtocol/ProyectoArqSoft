import type { Request, Response } from 'express';
import { CreateCompanyBookingCommand } from '../../../../src/application/commands/create-company-booking/create-company-booking.command';
import type { CreateCompanyBookingHandler } from '../../../../src/application/commands/create-company-booking/create-company-booking.handler';
import { CreateCompanyBookingController } from '../../../../src/presentation/controllers/create-company-booking.controller';

const mockExecute = jest.fn();
const mockHandler = {
  execute: mockExecute,
} as unknown as jest.Mocked<CreateCompanyBookingHandler>;

describe('CreateCompanyBookingController', () => {
  let controller: CreateCompanyBookingController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new CreateCompanyBookingController(mockHandler);
    req = {
      user: {
        id: 'auth0|company-id',
        roles: [],
      },
      body: {
        userId: 'body-user-id',
        originId: 'origin_123',
        destinationId: 'destination_123',
        date: '2999-07-10',
        items: [{ registeredItemId: 'item_123' }],
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('should create a company booking command from request body and authenticated user', async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    await controller.create(req as Request, res as Response);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(expect.any(CreateCompanyBookingCommand));

    const command = mockExecute.mock.calls[0][0];
    expect(command.userId).toBe('auth0|company-id');
    expect(command.originId).toBe('origin_123');
    expect(command.destinationId).toBe('destination_123');
    expect(command.date).toBe('2999-07-10');
    expect(command.items).toEqual([{ registeredItemId: 'item_123' }]);
  });

  it('should respond with 201 and the created bookingId', async () => {
    mockExecute.mockResolvedValueOnce('company-booking-id-123');

    await controller.create(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Booking created successfully',
      bookingId: 'company-booking-id-123',
    });
  });

  it('should propagate handler errors', async () => {
    const error = new Error('Booking failed');
    mockExecute.mockRejectedValueOnce(error);

    await expect(controller.create(req as Request, res as Response)).rejects.toThrow(
      'Booking failed'
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
