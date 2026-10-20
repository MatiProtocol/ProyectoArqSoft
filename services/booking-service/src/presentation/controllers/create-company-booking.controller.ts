import type { Request, Response } from 'express';
import {
  CreateCompanyBookingCommand,
  type CreateCompanyBookingItem,
} from '../../application/commands/create-company-booking/create-company-booking.command';
import type { CreateCompanyBookingHandler } from '../../application/commands/create-company-booking/create-company-booking.handler';
import type { CompanyBookingWriteDto } from '../../application/dtos/company-booking-write.dto';

export class CreateCompanyBookingController {
  constructor(private readonly commandHandler: CreateCompanyBookingHandler) {}

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CompanyBookingWriteDto;
    const userId = req.user!.id;

    const command = new CreateCompanyBookingCommand(
      userId,
      body.originId,
      body.destinationId,
      body.date,
      body.items as unknown as CreateCompanyBookingItem[]
    );

    const bookingId = await this.commandHandler.execute(command);

    res.status(201).json({ message: 'Booking created successfully', bookingId });
  }
}
