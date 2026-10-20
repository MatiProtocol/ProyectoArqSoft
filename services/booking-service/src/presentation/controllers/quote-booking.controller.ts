import { ErrorFactory } from '@move/errors-lib';
import type { Request, Response } from 'express';
import type { QuoteBookingHandler } from '../../application/commands/quote-booking/quote-booking.handler';

export class QuoteBookingController {
  constructor(private readonly handler: QuoteBookingHandler) {}

  async quote(req: Request, res: Response): Promise<void> {
    const bookingId = req.params['bookingId'];
    const userId = req.user!.id;

    if (!bookingId || bookingId.trim() === '') {
      throw ErrorFactory.badRequest('bookingId is required');
    }

    const result = await this.handler.execute({ bookingId, userId });
    res.status(200).json(result);
  }
}
