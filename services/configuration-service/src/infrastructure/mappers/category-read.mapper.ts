import type { CategoryReadDto } from '../../domain/dtos/category.dto';

type CategoryRuleDocument = {
  id: number;
  type: string;
};

type CategoryReadDocument = {
  _id: number;
  nameEn: string;
  nameEs: string;
  description?: string;
  rules?: CategoryRuleDocument[];
};

export function toCategoryReadDto(category: CategoryReadDocument): CategoryReadDto {
  return {
    id: category._id,
    nameEn: category.nameEn,
    nameEs: category.nameEs,
    description: category.description,
    rules: (category.rules ?? []).map((r) => ({ id: r.id, type: r.type })),
  };
}
