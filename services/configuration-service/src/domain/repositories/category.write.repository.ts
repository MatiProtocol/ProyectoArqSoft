import type { UpdateCategoryDto } from '../dtos/category.dto';
import type { Category } from '../entities/category';

export type CsvUpsertRow = {
  id: number;
  nameEn: string;
  nameEs: string;
  description?: string;
};

export type BulkUpsertResult = {
  inserted: number;
  updated: number;
};

export type CategoryRuleEntry = {
  id: number;
  type: string;
};

export interface ICategoryWriteRepository {
  create(category: Category): Promise<void>;
  updateCatalog(id: number, dto: UpdateCategoryDto): Promise<void>;
  bulkUpsertFromCsv(rows: CsvUpsertRow[]): Promise<BulkUpsertResult>;
  setRules(id: number, rules: CategoryRuleEntry[]): Promise<void>;
}
