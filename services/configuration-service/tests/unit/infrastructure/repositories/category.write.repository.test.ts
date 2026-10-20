import { MongoServerError } from 'mongodb';
import { Category } from '../../../../src/domain/entities/category';
import { CategorySource } from '../../../../src/domain/enums/category-source';
import { CategoryModel } from '../../../../src/infrastructure/models/category.model';
import { CategoryWriteRepository } from '../../../../src/infrastructure/repositories/category.write.repository';

const mockSave = jest.fn();
const mockLean = jest.fn();

jest.mock('../../../../src/infrastructure/models/category.model', () => {
  const ctor = jest.fn().mockImplementation(function (this: any, data: any) {
    Object.assign(this, data);
    this.save = mockSave;
    return this;
  });
  (ctor as any).updateOne = jest.fn();
  (ctor as any).bulkWrite = jest.fn();
  (ctor as any).findOne = jest.fn();
  return { CategoryModel: ctor };
});

const mockUpdateOne = (CategoryModel as any).updateOne as jest.Mock;
const mockBulkWrite = (CategoryModel as any).bulkWrite as jest.Mock;
const mockFindOne = (CategoryModel as any).findOne as jest.Mock;

function duplicateKeyError(keyPattern: Record<string, number>) {
  const error = new MongoServerError({ message: 'Duplicate key error' });
  error.code = 11000;
  error.keyPattern = keyPattern;
  return error;
}

describe('CategoryWriteRepository', () => {
  let repository: CategoryWriteRepository;

  beforeEach(() => {
    repository = new CategoryWriteRepository();
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: mockLean }),
      }),
    });
  });

  describe('create', () => {
    it('should assign the next contiguous id (max + 1) and save', async () => {
      mockLean.mockResolvedValueOnce({ _id: 270 });
      mockSave.mockResolvedValueOnce(undefined);

      const category = new Category('Luxury', 'Lujo', 'High-end');
      await repository.create(category);

      const builtDoc = (CategoryModel as unknown as jest.Mock).mock.calls[0][0];
      expect(builtDoc).toMatchObject({
        _id: 271,
        nameEn: 'Luxury',
        nameEs: 'Lujo',
        description: 'High-end',
        source: CategorySource.ADMIN,
      });
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should start ids at 1 when the collection is empty', async () => {
      mockLean.mockResolvedValueOnce(null);
      mockSave.mockResolvedValueOnce(undefined);

      await repository.create(new Category('First', 'Primera'));

      const builtDoc = (CategoryModel as unknown as jest.Mock).mock.calls[0][0];
      expect(builtDoc._id).toBe(1);
    });

    it('should throw a conflict error when the name pair already exists', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockRejectedValueOnce(duplicateKeyError({ nameEn: 1, nameEs: 1 }));

      await expect(repository.create(new Category('Sedan', 'Sedan'))).rejects.toMatchObject({
        status: 409,
      });
    });

    it('should retry id generation when a concurrent create grabbed the same _id', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 }).mockResolvedValueOnce({ _id: 6 });
      mockSave
        .mockRejectedValueOnce(duplicateKeyError({ _id: 1 }))
        .mockResolvedValueOnce(undefined);

      await repository.create(new Category('Luxury', 'Lujo'));

      expect(mockSave).toHaveBeenCalledTimes(2);
      const secondDoc = (CategoryModel as unknown as jest.Mock).mock.calls[1][0];
      expect(secondDoc._id).toBe(7);
    });

    it('should throw a conflict after exhausting id-generation retries', async () => {
      mockLean.mockResolvedValue({ _id: 5 });
      mockSave.mockRejectedValue(duplicateKeyError({ _id: 1 }));

      await expect(repository.create(new Category('Luxury', 'Lujo'))).rejects.toMatchObject({
        status: 409,
      });
      expect(mockSave).toHaveBeenCalledTimes(5);
    });

    it('should propagate non-duplicate errors thrown by save', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockRejectedValueOnce(new Error('Mongoose validation failed'));

      await expect(repository.create(new Category('Sedan', 'Sedan'))).rejects.toThrow(
        'Mongoose validation failed'
      );
    });
  });

  describe('updateCatalog', () => {
    it('should call updateOne by numeric _id and succeed when category exists', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.updateCatalog(42, { nameEs: 'Sedán', description: 'Updated' });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 42 },
        { $set: { nameEs: 'Sedán', description: 'Updated' } }
      );
    });

    it('should only set the provided fields (description only, no nameEs)', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.updateCatalog(42, { description: 'Only description' });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 42 },
        { $set: { description: 'Only description' } }
      );
    });

    it('should throw a not-found error if matchedCount is 0', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(repository.updateCatalog(999, { nameEs: 'Sedán' })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('setRules', () => {
    it('should set the rules array by numeric _id and succeed when the category exists', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.setRules(7, [
        { id: 2, type: 'ALERTS' },
        { id: 3, type: 'SURCHARGE' },
      ]);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 7 },
        {
          $set: {
            rules: [
              { id: 2, type: 'ALERTS' },
              { id: 3, type: 'SURCHARGE' },
            ],
          },
        }
      );
    });

    it('should throw a not-found error when matchedCount is 0', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(repository.setRules(999, [{ id: 2, type: 'ALERTS' }])).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('bulkUpsertFromCsv', () => {
    it('should return zero counts without calling bulkWrite for an empty row list', async () => {
      const result = await repository.bulkUpsertFromCsv([]);

      expect(mockBulkWrite).not.toHaveBeenCalled();
      expect(result).toEqual({ inserted: 0, updated: 0 });
    });

    it('should call bulkWrite with upsert operations keyed by numeric _id', async () => {
      mockBulkWrite.mockResolvedValueOnce({ upsertedCount: 1, modifiedCount: 1 });

      const result = await repository.bulkUpsertFromCsv([
        { id: 1, nameEn: 'Sedan', nameEs: 'Sedan', description: 'desc' },
        { id: 2, nameEn: 'Van', nameEs: 'Furgoneta' },
      ]);

      expect(mockBulkWrite).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { _id: 1 },
            update: {
              $set: {
                nameEn: 'Sedan',
                nameEs: 'Sedan',
                description: 'desc',
                source: CategorySource.CSV,
              },
            },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: { _id: 2 },
            update: {
              $set: {
                nameEn: 'Van',
                nameEs: 'Furgoneta',
                description: undefined,
                source: CategorySource.CSV,
              },
            },
            upsert: true,
          },
        },
      ]);
      expect(result).toEqual({ inserted: 1, updated: 1 });
    });
  });
});
