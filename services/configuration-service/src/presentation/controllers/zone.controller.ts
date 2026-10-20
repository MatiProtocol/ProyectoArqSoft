import type { Request, Response } from 'express';
import { CreateZoneCommand } from '../../application/commands/create-zone/create-zone.command';
import type { CreateZoneHandler } from '../../application/commands/create-zone/create-zone.handler';
import { DeleteZoneCommand } from '../../application/commands/delete-zone/delete-zone.command';
import type { DeleteZoneHandler } from '../../application/commands/delete-zone/delete-zone.handler';
import { UpdateZoneCommand } from '../../application/commands/update-zone/update-zone.command';
import type { UpdateZoneHandler } from '../../application/commands/update-zone/update-zone.handler';
import type { ListZonesHandler } from '../../application/queries/list-zones/list-zones.handler';
import { ListZonesQuery } from '../../application/queries/list-zones/list-zones.query';

export class ZoneController {
  constructor(
    private readonly createHandler: CreateZoneHandler,
    private readonly updateHandler: UpdateZoneHandler,
    private readonly deleteHandler: DeleteZoneHandler,
    private readonly listHandler: ListZonesHandler
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const command = CreateZoneCommand.create(req.body);
    const id = await this.createHandler.execute(command);

    res.status(201).json({ id, message: 'Zone created successfully' });
  }

  async update(req: Request, res: Response): Promise<void> {
    const command = UpdateZoneCommand.create(req.params.id, req.body);
    await this.updateHandler.execute(command);

    res.status(200).json({ message: 'Zone updated successfully' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const command = DeleteZoneCommand.create(req.params.id);
    await this.deleteHandler.execute(command);

    res.status(200).json({ message: 'Zone deleted successfully' });
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = ListZonesQuery.fromQueryParams(req.query);
    const zones = await this.listHandler.execute(query);

    res.status(200).json(zones);
  }
}
