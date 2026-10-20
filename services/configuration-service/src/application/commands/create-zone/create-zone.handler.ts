import { Zone } from '../../../domain/entities/zone';
import type { IZoneWriteRepository } from '../../../domain/repositories/zone.write.repository';
import type { CreateZoneCommand } from './create-zone.command';

export class CreateZoneHandler {
  constructor(private readonly writeRepository: IZoneWriteRepository) {}

  async execute(command: CreateZoneCommand): Promise<number> {
    const zone = new Zone(command.name, command.type, command.coordinates);

    return this.writeRepository.create(zone);
  }
}
