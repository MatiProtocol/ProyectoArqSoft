import type { Request, Response } from 'express';
import {
  CreateBookingCommand,
  type CreateBookingItem,
} from '../../application/commands/create-booking/create-booking.command';
import type { CreateBookingHandler } from '../../application/commands/create-booking/create-booking.handler';
import type { BookingWriteDto } from '../../application/dtos/booking-write.dto';

export class CreateBookingController {
  constructor(private readonly commandHandler: CreateBookingHandler) {}

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as BookingWriteDto;
    const userId = req.user!.id;

    const command = new CreateBookingCommand(
      userId,
      body.origin,
      body.destination,
      body.date,
      body.items as unknown as CreateBookingItem[]
    );

    const bookingId = await this.commandHandler.execute(command);

    res.status(201).json({ message: 'Booking created successfully', bookingId });
  }
}
