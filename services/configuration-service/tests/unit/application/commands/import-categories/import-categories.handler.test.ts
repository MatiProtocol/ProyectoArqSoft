import { ImportCategoriesCommand } from '../../../../../src/application/commands/import-categories/import-categories.command';
import { ImportCategoriesHandler } from '../../../../../src/application/commands/import-categories/import-categories.handler';
import type { ICategoryWriteRepository } from '../../../../../src/domain/repositories/category.write.repository';

describe('ImportCategoriesHandler', () => {
  let mockWriteRepository: jest.Mocked<ICategoryWriteRepository>;
  let handler: ImportCategoriesHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      updateCatalog: jest.fn(),
      bulkUpsertFromCsv: jest.fn(),
      setRules: jest.fn(),
    };
    handler = new ImportCategoriesHandler(mockWriteRepository);
  });

  it('should reject a CSV with an invalid header', async () => {
    const csv = 'wrong,header,format\n1,Sedan,Sedan,desc';
    const command = new ImportCategoriesCommand(csv);

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 400 });
    expect(mockWriteRepository.bulkUpsertFromCsv).not.toHaveBeenCalled();
  });

  it('should parse valid rows with numeric ids and delegate the bulk upsert', async () => {
    const csv = [
      'id,category_name,category_name_es,description',
      '1,Sedan,Sedan,A standard sedan',
      '2,Van,Furgoneta,A cargo van',
    ].join('\n');
    const command = new ImportCategoriesCommand(csv);

    mockWriteRepository.bulkUpsertFromCsv.mockResolvedValueOnce({ inserted: 2, updated: 0 });

    const result = await handler.execute(command);

    expect(mockWriteRepository.bulkUpsertFromCsv).toHaveBeenCalledWith([
      { id: 1, nameEn: 'Sedan', nameEs: 'Sedan', description: 'A standard sedan' },
      { id: 2, nameEn: 'Van', nameEs: 'Furgoneta', description: 'A cargo van' },
    ]);
    expect(result).toEqual({ inserted: 2, updated: 0, errors: [] });
  });

  it('should collect row-level errors and skip invalid rows from the upsert', async () => {
    const csv = [
      'id,category_name,category_name_es,description',
      '1,Sedan,Sedan,A standard sedan',
      ',MissingId,Sin id,desc',
      'abc,NonNumeric,No numerico,desc',
      '4,,Sin nombre en,desc',
      '5,OnlyEnglish,,desc',
    ].join('\n');
    const command = new ImportCategoriesCommand(csv);

    mockWriteRepository.bulkUpsertFromCsv.mockResolvedValueOnce({ inserted: 1, updated: 0 });

    const result = await handler.execute(command);

    expect(mockWriteRepository.bulkUpsertFromCsv).toHaveBeenCalledWith([
      { id: 1, nameEn: 'Sedan', nameEs: 'Sedan', description: 'A standard sedan' },
    ]);
    expect(result.errors).toEqual([
      { row: 3, message: 'id is required' },
      { row: 4, message: 'id must be a positive integer' },
      { row: 5, message: 'category_name is required' },
      { row: 6, message: 'category_name_es is required' },
    ]);
  });

  it('should return zero counts and no errors for a CSV with only a header row', async () => {
    const csv = 'id,category_name,category_name_es,description';
    const command = new ImportCategoriesCommand(csv);

    mockWriteRepository.bulkUpsertFromCsv.mockResolvedValueOnce({ inserted: 0, updated: 0 });

    const result = await handler.execute(command);

    expect(mockWriteRepository.bulkUpsertFromCsv).toHaveBeenCalledWith([]);
    expect(result).toEqual({ inserted: 0, updated: 0, errors: [] });
  });
});
