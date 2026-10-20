import type { IVehicleWriteRepository } from '../../../domain/repositories/vehicle.write.repository';
import type { UpdateVehicleCommand } from './update-vehicle.command';

export class UpdateVehicleHandler {
  constructor(private readonly writeRepository: IVehicleWriteRepository) {}

  async execute(command: UpdateVehicleCommand): Promise<void> {
    await this.writeRepository.update(command.id, {
      licensePlate: command.licensePlate,
      type: command.type,
      capacity: command.capacity,
      available: command.available,
      deviceId: command.deviceId,
      characteristics: command.characteristics,
    });
  }
}
