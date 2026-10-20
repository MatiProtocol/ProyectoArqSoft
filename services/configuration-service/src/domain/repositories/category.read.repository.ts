import type { CategoryReadDto } from '../dtos/category.dto';

export interface ICategoryReadRepository {
  getAllActive(): Promise<CategoryReadDto[]>;
  findById(id: number): Promise<CategoryReadDto | null>;
  countWithRules(): Promise<number>;
}
