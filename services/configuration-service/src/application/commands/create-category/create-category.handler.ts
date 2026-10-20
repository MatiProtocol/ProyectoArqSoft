import { Category } from '../../../domain/entities/category';
import { CategorySource } from '../../../domain/enums/category-source';
import type { ICategoryWriteRepository } from '../../../domain/repositories/category.write.repository';
import type { CreateCategoryCommand } from './create-category.command';

export class CreateCategoryHandler {
  constructor(private readonly writeRepository: ICategoryWriteRepository) {}

  async execute(command: CreateCategoryCommand): Promise<void> {
    const category = new Category(
      command.nameEn,
      command.nameEs,
      command.description,
      CategorySource.ADMIN
    );

    await this.writeRepository.create(category);
  }
}
