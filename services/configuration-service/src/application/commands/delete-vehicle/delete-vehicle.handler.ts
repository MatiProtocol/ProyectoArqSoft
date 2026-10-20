import type { IVehicleWriteRepository } from '../../../domain/repositories/vehicle.write.repository';
import type { DeleteVehicleCommand } from './delete-vehicle.command';

export class DeleteVehicleHandler {
  constructor(private readonly writeRepository: IVehicleWriteRepository) {}

  async execute(command: DeleteVehicleCommand): Promise<void> {
    await this.writeRepository.delete(command.id);
  }
}
