import type { VehicleReadDto } from '../../../domain/dtos/vehicle-read.dto';
import type { IVehicleReadRepository } from '../../../domain/repositories/vehicle.read.repository';
import type { ListVehiclesQuery } from './list-vehicles.query';

export class ListVehiclesHandler {
  constructor(private readonly readRepository: IVehicleReadRepository) {}

  async execute(query: ListVehiclesQuery): Promise<VehicleReadDto[]> {
    return this.readRepository.getAll({
      available: query.available,
      type: query.type,
      deviceId: query.deviceId,
      limit: query.limit,
      skip: query.skip,
    });
  }
}
