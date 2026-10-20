export type CategoryRuleEntry = {
  id: number;
  type: string;
};

export type CategoryCatalogItem = {
  id: number;
  nameEn: string;
  nameEs: string;
  description?: string;
  rules: CategoryRuleEntry[];
};

export interface CategoryCatalogClient {
  getActiveCategories(): Promise<CategoryCatalogItem[]>;
}
