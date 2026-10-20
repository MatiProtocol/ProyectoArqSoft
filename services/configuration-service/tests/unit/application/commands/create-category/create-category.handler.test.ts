import { CreateCategoryCommand } from '../../../../../src/application/commands/create-category/create-category.command';
import { CreateCategoryHandler } from '../../../../../src/application/commands/create-category/create-category.handler';
import { Category } from '../../../../../src/domain/entities/category';
import { CategorySource } from '../../../../../src/domain/enums/category-source';
import type { ICategoryWriteRepository } from '../../../../../src/domain/repositories/category.write.repository';

describe('CreateCategoryHandler', () => {
  let mockWriteRepository: jest.Mocked<ICategoryWriteRepository>;
  let handler: CreateCategoryHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      updateCatalog: jest.fn(),
      bulkUpsertFromCsv: jest.fn(),
      setRules: jest.fn(),
    };
    handler = new CreateCategoryHandler(mockWriteRepository);
  });

  it('should create a category with ADMIN source (id is assigned by the repository)', async () => {
    const command = new CreateCategoryCommand('Luxury', 'Lujo', 'High-end vehicles');

    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
    const passedCategory = mockWriteRepository.create.mock.calls[0][0];
    expect(passedCategory).toBeInstanceOf(Category);
    expect(passedCategory.nameEn).toBe('Luxury');
    expect(passedCategory.nameEs).toBe('Lujo');
    expect(passedCategory.description).toBe('High-end vehicles');
    expect(passedCategory.source).toBe(CategorySource.ADMIN);
  });

  it('should create a category without description', async () => {
    const command = new CreateCategoryCommand('Van', 'Furgoneta');

    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    const passedCategory = mockWriteRepository.create.mock.calls[0][0];
    expect(passedCategory.description).toBeUndefined();
  });

  it('should propagate errors thrown by the repository', async () => {
    const command = new CreateCategoryCommand('Sedan', 'Sedan');
    const repoError = new Error('Duplicate name');
    mockWriteRepository.create.mockRejectedValueOnce(repoError);

    await expect(handler.execute(command)).rejects.toThrow('Duplicate name');
  });
});
