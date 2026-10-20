import { ListCategoriesHandler } from '../../../../../src/application/queries/list-categories/list-categories.handler';
import type { ICategoryReadRepository } from '../../../../../src/domain/repositories/category.read.repository';

describe('ListCategoriesHandler', () => {
  let mockReadRepository: jest.Mocked<ICategoryReadRepository>;
  let handler: ListCategoriesHandler;

  beforeEach(() => {
    mockReadRepository = {
      getAllActive: jest.fn(),
      findById: jest.fn(),
      countWithRules: jest.fn(),
    };
    handler = new ListCategoriesHandler(mockReadRepository);
  });

  it('should delegate to the read repository', async () => {
    const categories = [
      {
        id: 1,
        nameEn: 'Furniture',
        nameEs: 'Muebles',
        description: 'Home items',
        rules: [
          { id: 2, type: 'ALERTS' },
          { id: 3, type: 'SURCHARGE' },
        ],
      },
    ];
    mockReadRepository.getAllActive.mockResolvedValueOnce(categories);

    const result = await handler.execute();

    expect(mockReadRepository.getAllActive).toHaveBeenCalledTimes(1);
    expect(result).toBe(categories);
  });
});
