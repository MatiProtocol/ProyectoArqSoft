import { ErrorFactory } from '@move/errors-lib';
import type { Request, Response } from 'express';
import type { PayBookingHandler } from '../../application/commands/pay-booking/pay-booking.handler';

export class PayBookingController {
  constructor(private readonly handler: PayBookingHandler) {}

  async pay(req: Request, res: Response): Promise<void> {
    const bookingId = req.params['bookingId'];
    const userId = req.user!.id;
    const { methodToken, simulateOutcome } = req.body ?? {};

    if (!bookingId || bookingId.trim() === '') {
      throw ErrorFactory.badRequest('bookingId is required');
    }

    const result = await this.handler.execute({ bookingId, userId, methodToken, simulateOutcome });
    res.status(result.retryQueued ? 202 : 200).json(result);
  }
}
