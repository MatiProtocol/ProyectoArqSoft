import { MongoServerError } from 'mongodb';
import { Zone } from '../../../../src/domain/entities/zone';
import { ZoneType } from '../../../../src/domain/enums/zone-type';
import { ZoneModel } from '../../../../src/infrastructure/models/zone.model';
import { ZoneWriteRepository } from '../../../../src/infrastructure/repositories/zone.write.repository';

const mockSave = jest.fn();
const mockLean = jest.fn();

jest.mock('../../../../src/infrastructure/models/zone.model', () => {
  const ctor = jest.fn().mockImplementation(function (this: any, data: any) {
    Object.assign(this, data);
    this.save = mockSave;
    return this;
  });
  (ctor as any).updateOne = jest.fn();
  (ctor as any).deleteOne = jest.fn();
  (ctor as any).findOne = jest.fn();
  return { ZoneModel: ctor };
});

const mockUpdateOne = (ZoneModel as any).updateOne as jest.Mock;
const mockDeleteOne = (ZoneModel as any).deleteOne as jest.Mock;
const mockFindOne = (ZoneModel as any).findOne as jest.Mock;

const ring: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];
const polygon = { type: 'Polygon', coordinates: [ring] };

function duplicateKeyError(keyPattern: Record<string, number>) {
  const error = new MongoServerError({ message: 'Duplicate key error' });
  error.code = 11000;
  error.keyPattern = keyPattern;
  return error;
}

describe('ZoneWriteRepository', () => {
  let repository: ZoneWriteRepository;

  beforeEach(() => {
    repository = new ZoneWriteRepository();
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: mockLean }),
      }),
    });
  });

  describe('create', () => {
    it('should assign the next contiguous id, wrap coordinates into a polygon and return the id', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockResolvedValueOnce(undefined);

      const id = await repository.create(new Zone('Centro', ZoneType.RED_ZONE, ring));

      expect(id).toBe(6);
      expect(ZoneModel).toHaveBeenCalledWith({
        _id: 6,
        name: 'Centro',
        type: ZoneType.RED_ZONE,
        polygon,
      });
    });

    it('should start ids at 1 when the collection is empty', async () => {
      mockLean.mockResolvedValueOnce(null);
      mockSave.mockResolvedValueOnce(undefined);

      const id = await repository.create(new Zone('Centro', ZoneType.RED_ZONE, ring));

      expect(id).toBe(1);
    });

    it('should throw a conflict when the name already exists', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockRejectedValueOnce(duplicateKeyError({ name: 1 }));

      await expect(
        repository.create(new Zone('Centro', ZoneType.RED_ZONE, ring))
      ).rejects.toMatchObject({ status: 409 });
    });

    it('should retry id generation on a concurrent _id collision', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 }).mockResolvedValueOnce({ _id: 6 });
      mockSave
        .mockRejectedValueOnce(duplicateKeyError({ _id: 1 }))
        .mockResolvedValueOnce(undefined);

      const id = await repository.create(new Zone('Centro', ZoneType.RED_ZONE, ring));

      expect(id).toBe(7);
      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    it('should throw a conflict after exhausting id retries', async () => {
      mockLean.mockResolvedValue({ _id: 5 });
      mockSave.mockRejectedValue(duplicateKeyError({ _id: 1 }));

      await expect(
        repository.create(new Zone('Centro', ZoneType.RED_ZONE, ring))
      ).rejects.toMatchObject({ status: 409 });
      expect(mockSave).toHaveBeenCalledTimes(5);
    });

    it('should propagate non-duplicate errors', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockRejectedValueOnce(new Error('db down'));

      await expect(repository.create(new Zone('Centro', ZoneType.RED_ZONE, ring))).rejects.toThrow(
        'db down'
      );
    });
  });

  describe('update', () => {
    it('should set only provided fields and wrap coordinates', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.update(6, { name: 'Nueva', coordinates: ring });

      expect(mockUpdateOne).toHaveBeenCalledWith({ _id: 6 }, { $set: { name: 'Nueva', polygon } });
    });

    it('should set only the type when it is the only field provided', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.update(6, { type: ZoneType.PREFERRED_ZONE });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 6 },
        { $set: { type: ZoneType.PREFERRED_ZONE } }
      );
    });

    it('should throw a conflict on duplicate name', async () => {
      mockUpdateOne.mockRejectedValueOnce(duplicateKeyError({ name: 1 }));

      await expect(repository.update(6, { name: 'dup' })).rejects.toMatchObject({ status: 409 });
    });

    it('should propagate non-duplicate update errors', async () => {
      mockUpdateOne.mockRejectedValueOnce(new Error('db down'));

      await expect(repository.update(6, { name: 'x' })).rejects.toThrow('db down');
    });

    it('should throw 404 when no document matches', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(repository.update(999, { name: 'x' })).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('delete', () => {
    it('should delete and succeed', async () => {
      mockDeleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      await repository.delete(6);

      expect(mockDeleteOne).toHaveBeenCalledWith({ _id: 6 });
    });

    it('should throw 404 when nothing was deleted', async () => {
      mockDeleteOne.mockResolvedValueOnce({ deletedCount: 0 });

      await expect(repository.delete(999)).rejects.toMatchObject({ status: 404 });
    });
  });
});
