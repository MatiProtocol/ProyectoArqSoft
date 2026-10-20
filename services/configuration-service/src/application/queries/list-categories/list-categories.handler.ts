import type { CategoryReadDto } from '../../../domain/dtos/category.dto';
import type { ICategoryReadRepository } from '../../../domain/repositories/category.read.repository';

export class ListCategoriesHandler {
  constructor(private readonly readRepository: ICategoryReadRepository) {}

  async execute(): Promise<CategoryReadDto[]> {
    return this.readRepository.getAllActive();
  }
}
