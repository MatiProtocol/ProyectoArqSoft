import type { Request, Response } from 'express';
import type { ListRulesHandler } from '../../application/queries/list-rules/list-rules.handler';

export class RuleController {
  constructor(private readonly listHandler: ListRulesHandler) {}

  async list(_req: Request, res: Response): Promise<void> {
    const rules = await this.listHandler.execute();

    res.status(200).json(rules);
  }
}
