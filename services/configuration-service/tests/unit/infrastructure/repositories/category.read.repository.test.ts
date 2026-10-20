import { CategoryModel } from '../../../../src/infrastructure/models/category.model';
import { CategoryReadRepository } from '../../../../src/infrastructure/repositories/category.read.repository';

const mockLean = jest.fn();
const mockSort = jest.fn();
const mockFindByIdLean = jest.fn();

jest.mock('../../../../src/infrastructure/models/category.model', () => ({
  CategoryModel: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const mockFind = (CategoryModel as unknown as { find: jest.Mock }).find;
const mockFindById = (CategoryModel as unknown as { findById: jest.Mock }).findById;
const mockCountDocuments = (CategoryModel as unknown as { countDocuments: jest.Mock })
  .countDocuments;

const EXPECTED_PROJECTION = { _id: 1, nameEn: 1, nameEs: 1, description: 1, rules: 1 };

describe('CategoryReadRepository', () => {
  let repository: CategoryReadRepository;

  beforeEach(() => {
    repository = new CategoryReadRepository();
    jest.clearAllMocks();
    mockSort.mockReturnValue({ lean: mockLean });
    mockFind.mockReturnValue({ sort: mockSort });
    mockFindById.mockReturnValue({ lean: mockFindByIdLean });
  });

  describe('getAllActive', () => {
    it('should query active categories with the read projection (incl. rules) and map results', async () => {
      mockLean.mockResolvedValueOnce([
        {
          _id: 1,
          nameEn: 'Furniture',
          nameEs: 'Muebles',
          description: 'Home items',
          rules: [
            { id: 2, type: 'ALERTS' },
            { id: 3, type: 'SURCHARGE' },
          ],
        },
      ]);

      const result = await repository.getAllActive();

      expect(mockFind).toHaveBeenCalledWith({ active: true }, EXPECTED_PROJECTION);
      expect(mockSort).toHaveBeenCalledWith({ _id: 1 });
      expect(result).toEqual([
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
      ]);
    });
  });

  describe('findById', () => {
    it('should return the mapped category when it exists', async () => {
      mockFindByIdLean.mockResolvedValueOnce({
        _id: 7,
        nameEn: 'Electronics',
        nameEs: 'Electrónica',
        rules: [],
      });

      const result = await repository.findById(7);

      expect(mockFindById).toHaveBeenCalledWith(7, EXPECTED_PROJECTION);
      expect(result).toEqual({
        id: 7,
        nameEn: 'Electronics',
        nameEs: 'Electrónica',
        description: undefined,
        rules: [],
      });
    });

    it('should return null when the category does not exist', async () => {
      mockFindByIdLean.mockResolvedValueOnce(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('countWithRules', () => {
    it('should count categories whose rules array is non-empty', async () => {
      mockCountDocuments.mockResolvedValueOnce(4);

      const result = await repository.countWithRules();

      expect(mockCountDocuments).toHaveBeenCalledWith({ 'rules.0': { $exists: true } });
      expect(result).toBe(4);
    });
  });
});
