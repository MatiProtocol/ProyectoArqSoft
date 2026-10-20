import type { CategoryReadDto } from '../../domain/dtos/category.dto';
import type { ICategoryReadRepository } from '../../domain/repositories/category.read.repository';
import { toCategoryReadDto } from '../mappers/category-read.mapper';
import { CategoryModel } from '../models/category.model';

const CATEGORY_READ_PROJECTION = {
  _id: 1,
  nameEn: 1,
  nameEs: 1,
  description: 1,
  rules: 1,
} as const;

export class CategoryReadRepository implements ICategoryReadRepository {
  async getAllActive(): Promise<CategoryReadDto[]> {
    const categoryDocuments = await CategoryModel.find({ active: true }, CATEGORY_READ_PROJECTION)
      .sort({ _id: 1 })
      .lean();

    return categoryDocuments.map((category) => toCategoryReadDto(category));
  }

  async findById(id: number): Promise<CategoryReadDto | null> {
    const category = await CategoryModel.findById(id, CATEGORY_READ_PROJECTION).lean();
    if (!category) return null;

    return toCategoryReadDto(category);
  }

  async countWithRules(): Promise<number> {
    return CategoryModel.countDocuments({ 'rules.0': { $exists: true } });
  }
}
