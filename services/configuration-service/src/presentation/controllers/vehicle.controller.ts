import type { Request, Response } from 'express';
import { CreateVehicleCommand } from '../../application/commands/create-vehicle/create-vehicle.command';
import type { CreateVehicleHandler } from '../../application/commands/create-vehicle/create-vehicle.handler';
import { DeleteVehicleCommand } from '../../application/commands/delete-vehicle/delete-vehicle.command';
import type { DeleteVehicleHandler } from '../../application/commands/delete-vehicle/delete-vehicle.handler';
import { UpdateVehicleCommand } from '../../application/commands/update-vehicle/update-vehicle.command';
import type { UpdateVehicleHandler } from '../../application/commands/update-vehicle/update-vehicle.handler';
import type { ListVehiclesHandler } from '../../application/queries/list-vehicles/list-vehicles.handler';
import { ListVehiclesQuery } from '../../application/queries/list-vehicles/list-vehicles.query';

export class VehicleController {
  constructor(
    private readonly createHandler: CreateVehicleHandler,
    private readonly updateHandler: UpdateVehicleHandler,
    private readonly deleteHandler: DeleteVehicleHandler,
    private readonly listHandler: ListVehiclesHandler
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const command = CreateVehicleCommand.create(req.body);
    const id = await this.createHandler.execute(command);

    res.status(201).json({ id, message: 'Vehicle created successfully' });
  }

  async update(req: Request, res: Response): Promise<void> {
    const command = UpdateVehicleCommand.create(req.params.id, req.body);
    await this.updateHandler.execute(command);

    res.status(200).json({ message: 'Vehicle updated successfully' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const command = DeleteVehicleCommand.create(req.params.id);
    await this.deleteHandler.execute(command);

    res.status(200).json({ message: 'Vehicle deleted successfully' });
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = ListVehiclesQuery.fromQueryParams(req.query);
    const vehicles = await this.listHandler.execute(query);

    res.status(200).json(vehicles);
  }
}
