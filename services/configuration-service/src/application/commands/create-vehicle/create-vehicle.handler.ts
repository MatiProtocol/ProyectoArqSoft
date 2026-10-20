import { Vehicle } from '../../../domain/entities/vehicle';
import type { IVehicleWriteRepository } from '../../../domain/repositories/vehicle.write.repository';
import type { CreateVehicleCommand } from './create-vehicle.command';

export class CreateVehicleHandler {
  constructor(private readonly writeRepository: IVehicleWriteRepository) {}

  async execute(command: CreateVehicleCommand): Promise<number> {
    const vehicle = new Vehicle(
      command.licensePlate,
      command.type,
      command.capacity,
      command.deviceId,
      command.characteristics,
      command.available ?? true
    );

    return this.writeRepository.create(vehicle);
  }
}
