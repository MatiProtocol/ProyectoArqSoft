import type { IZoneWriteRepository } from '../../../domain/repositories/zone.write.repository';
import type { UpdateZoneCommand } from './update-zone.command';

export class UpdateZoneHandler {
  constructor(private readonly writeRepository: IZoneWriteRepository) {}

  async execute(command: UpdateZoneCommand): Promise<void> {
    await this.writeRepository.update(command.id, {
      name: command.name,
      type: command.type,
      coordinates: command.coordinates,
    });
  }
}
