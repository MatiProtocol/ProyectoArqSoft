export type CreateCategoryDto = {
  nameEn: string;
  nameEs: string;
  description?: string;
};

export type UpdateCategoryDto = {
  nameEs?: string;
  description?: string;
};

export type CategoryRuleEntryDto = {
  id: number;
  type: string;
};

export type CategoryReadDto = {
  id: number;
  nameEn: string;
  nameEs: string;
  description?: string;
  rules: CategoryRuleEntryDto[];
};

export type ImportCategoriesResultDto = {
  inserted: number;
  updated: number;
  errors: { row: number; message: string }[];
};
