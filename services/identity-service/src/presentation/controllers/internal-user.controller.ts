import type { Request, Response } from 'express';
import type { GetUserDetailHandler } from '../../application/queries/get-user-detail/get-user-detail-handler';
import { GetUserDetailQuery } from '../../application/queries/get-user-detail/get-user-detail-query';

export class InternalUserController {
  constructor(private readonly getUserDetailHandler: GetUserDetailHandler) {}

  async getById(req: Request, res: Response): Promise<void> {
    const user = await this.getUserDetailHandler.execute(new GetUserDetailQuery(req.params.userId));

    res.status(200).json(user);
  }
}
