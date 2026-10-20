import type { Request, Response } from 'express';
import { CreateBookingCommand } from '../../../../src/application/commands/create-booking/create-booking.command';
import type { CreateBookingHandler } from '../../../../src/application/commands/create-booking/create-booking.handler';
import { ItemSizeDto } from '../../../../src/application/dtos/enums/item-size.dto';
import { CreateBookingController } from '../../../../src/presentation/controllers/create-booking.controller';

const mockExecute = jest.fn();
const mockHandler = {
  execute: mockExecute,
} as unknown as jest.Mocked<CreateBookingHandler>;

describe('CreateBookingController', () => {
  let controller: CreateBookingController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new CreateBookingController(mockHandler);
    req = {
      user: {
        id: 'auth0|user-id',
        roles: [],
      },
      body: {
        userId: 'body-user-id',
        origin: [-56.16, -34.9],
        destination: [-56.03, -34.83],
        date: '2999-07-10',
        category: 'furniture',
        status: 'classified',
        items: [
          {
            description: 'Mesa de madera',
            value: '1500',
            size: ItemSizeDto.MEDIUM,
          },
        ],
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('should create a booking command from request body and authenticated user', async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    await controller.create(req as Request, res as Response);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(expect.any(CreateBookingCommand));

    const command = mockExecute.mock.calls[0][0];
    expect(command.userId).toBe('auth0|user-id');
    expect(command.origin).toEqual([-56.16, -34.9]);
    expect(command.destination).toEqual([-56.03, -34.83]);
    expect(command.date).toBe('2999-07-10');
    expect(command.items).toEqual([
      {
        description: 'Mesa de madera',
        value: '1500',
        size: ItemSizeDto.MEDIUM,
      },
    ]);
  });

  it('should respond with 201 and the created bookingId', async () => {
    mockExecute.mockResolvedValueOnce('booking-id-123');

    await controller.create(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Booking created successfully',
      bookingId: 'booking-id-123',
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
