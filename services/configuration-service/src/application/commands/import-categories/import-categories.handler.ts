import { ErrorFactory } from '@move/errors-lib';
import { parse } from 'csv-parse/sync';
import type { ImportCategoriesResultDto } from '../../../domain/dtos/category.dto';
import type {
  CsvUpsertRow,
  ICategoryWriteRepository,
} from '../../../domain/repositories/category.write.repository';
import type { ImportCategoriesCommand } from './import-categories.command';

const EXPECTED_HEADER = 'id,category_name,category_name_es,description';

type CsvRecord = {
  id?: string;
  category_name?: string;
  category_name_es?: string;
  description?: string;
};

export class ImportCategoriesHandler {
  constructor(private readonly writeRepository: ICategoryWriteRepository) {}

  async execute(command: ImportCategoriesCommand): Promise<ImportCategoriesResultDto> {
    const firstLine = command.csvContent.split(/\r?\n/, 1)[0]?.trim();
    if (firstLine !== EXPECTED_HEADER) {
      throw ErrorFactory.badRequest(`CSV header must be exactly: ${EXPECTED_HEADER}`);
    }

    const records: CsvRecord[] = parse(command.csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const rows: CsvUpsertRow[] = [];
    const errors: { row: number; message: string }[] = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2;
      const rawId = record.id?.trim();
      const nameEn = record.category_name?.trim();
      const nameEs = record.category_name_es?.trim();

      if (!rawId) {
        errors.push({ row: rowNumber, message: 'id is required' });
        return;
      }
      if (!/^\d+$/.test(rawId)) {
        errors.push({ row: rowNumber, message: 'id must be a positive integer' });
        return;
      }
      if (!nameEn) {
        errors.push({ row: rowNumber, message: 'category_name is required' });
        return;
      }
      if (!nameEs) {
        errors.push({ row: rowNumber, message: 'category_name_es is required' });
        return;
      }

      rows.push({
        id: Number(rawId),
        nameEn,
        nameEs,
        description: record.description?.trim(),
      });
    });

    const { inserted, updated } = await this.writeRepository.bulkUpsertFromCsv(rows);

    return { inserted, updated, errors };
  }
}
