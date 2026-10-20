import type { ICategoryWriteRepository } from '../../../domain/repositories/category.write.repository';
import type { UpdateCategoryCommand } from './update-category.command';

export class UpdateCategoryHandler {
  constructor(private readonly writeRepository: ICategoryWriteRepository) {}

  async execute(command: UpdateCategoryCommand): Promise<void> {
    await this.writeRepository.updateCatalog(command.id, {
      nameEs: command.nameEs,
      description: command.description,
    });
  }
}
