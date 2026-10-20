import { UpdateCategoryCommand } from '../../../../../src/application/commands/update-category/update-category.command';
import { UpdateCategoryHandler } from '../../../../../src/application/commands/update-category/update-category.handler';
import type { ICategoryWriteRepository } from '../../../../../src/domain/repositories/category.write.repository';

describe('UpdateCategoryHandler', () => {
  let mockWriteRepository: jest.Mocked<ICategoryWriteRepository>;
  let handler: UpdateCategoryHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      updateCatalog: jest.fn(),
      bulkUpsertFromCsv: jest.fn(),
      setRules: jest.fn(),
    };
    handler = new UpdateCategoryHandler(mockWriteRepository);
  });

  it('should delegate the catalog update to the repository with the numeric id', async () => {
    const command = new UpdateCategoryCommand(42, 'Sedán', 'Updated description');

    mockWriteRepository.updateCatalog.mockResolvedValueOnce();

    await handler.execute(command);

    expect(mockWriteRepository.updateCatalog).toHaveBeenCalledWith(42, {
      nameEs: 'Sedán',
      description: 'Updated description',
    });
  });

  it('should propagate a not-found error from the repository', async () => {
    const command = new UpdateCategoryCommand(999, 'Sedán');
    const notFoundError = Object.assign(new Error('Category not found'), { status: 404 });
    mockWriteRepository.updateCatalog.mockRejectedValueOnce(notFoundError);

    await expect(handler.execute(command)).rejects.toThrow('Category not found');
  });
});
