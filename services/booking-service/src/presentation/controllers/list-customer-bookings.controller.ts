import type { Request, Response } from 'express';
import type { ListCustomerBookingsHandler } from '../../application/queries/list-customer-bookings/list-customer-bookings.handler';
import { ListCustomerBookingsQuery } from '../../application/queries/list-customer-bookings/list-customer-bookings.query';

export class ListCustomerBookingsController {
  constructor(private readonly handler: ListCustomerBookingsHandler) {}

  async list(req: Request, res: Response): Promise<void> {
    const query = ListCustomerBookingsQuery.fromQueryParams(req.user?.id ?? '', req.query);
    const bookings = await this.handler.execute(query);

    res.status(200).json(bookings);
  }
}
