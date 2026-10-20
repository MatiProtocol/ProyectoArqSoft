import type { IZoneWriteRepository } from '../../../domain/repositories/zone.write.repository';
import type { DeleteZoneCommand } from './delete-zone.command';

export class DeleteZoneHandler {
  constructor(private readonly writeRepository: IZoneWriteRepository) {}

  async execute(command: DeleteZoneCommand): Promise<void> {
    await this.writeRepository.delete(command.id);
  }
}
