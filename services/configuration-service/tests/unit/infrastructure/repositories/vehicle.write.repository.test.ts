import { MongoServerError } from 'mongodb';
import { Vehicle } from '../../../../src/domain/entities/vehicle';
import { VehicleType } from '../../../../src/domain/enums/vehicle-type';
import { VehicleModel } from '../../../../src/infrastructure/models/vehicle.model';
import { VehicleWriteRepository } from '../../../../src/infrastructure/repositories/vehicle.write.repository';

const mockSave = jest.fn();
const mockLean = jest.fn();

jest.mock('../../../../src/infrastructure/models/vehicle.model', () => {
  const ctor = jest.fn().mockImplementation(function (this: any, data: any) {
    Object.assign(this, data);
    this.save = mockSave;
    return this;
  });
  (ctor as any).updateOne = jest.fn();
  (ctor as any).deleteOne = jest.fn();
  (ctor as any).findOne = jest.fn();
  return { VehicleModel: ctor };
});

const mockUpdateOne = (VehicleModel as any).updateOne as jest.Mock;
const mockDeleteOne = (VehicleModel as any).deleteOne as jest.Mock;
const mockFindOne = (VehicleModel as any).findOne as jest.Mock;

function duplicateKeyError(keyPattern: Record<string, number>) {
  const error = new MongoServerError({ message: 'Duplicate key error' });
  error.code = 11000;
  error.keyPattern = keyPattern;
  return error;
}

describe('VehicleWriteRepository', () => {
  let repository: VehicleWriteRepository;

  beforeEach(() => {
    repository = new VehicleWriteRepository();
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: mockLean }),
      }),
    });
  });

  describe('create', () => {
    it('should assign the next contiguous id and return it', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockResolvedValueOnce(undefined);

      const id = await repository.create(
        new Vehicle('VAN-12', VehicleType.VAN, 4, 'dev-1', { refrigerated: true }, true)
      );

      expect(id).toBe(6);
      expect(VehicleModel).toHaveBeenCalledWith({
        _id: 6,
        licensePlate: 'VAN-12',
        type: VehicleType.VAN,
        capacity: 4,
        available: true,
        deviceId: 'dev-1',
        characteristics: { refrigerated: true },
      });
    });

    it('should start ids at 1 when the collection is empty', async () => {
      mockLean.mockResolvedValueOnce(null);
      mockSave.mockResolvedValueOnce(undefined);

      const id = await repository.create(new Vehicle('VAN-12', VehicleType.VAN, 4));

      expect(id).toBe(1);
    });

    it('should throw a deviceId conflict on 11000 with deviceId keyPattern', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockRejectedValueOnce(duplicateKeyError({ deviceId: 1 }));

      await expect(
        repository.create(new Vehicle('VAN-12', VehicleType.VAN, 4, 'dev-1'))
      ).rejects.toMatchObject({ status: 409 });
    });

    it('should throw a license-plate conflict on 11000 without deviceId keyPattern', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockRejectedValueOnce(duplicateKeyError({ licensePlate: 1 }));

      await expect(
        repository.create(new Vehicle('VAN-12', VehicleType.VAN, 4))
      ).rejects.toMatchObject({ status: 409 });
    });

    it('should retry id generation on a concurrent _id collision', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 }).mockResolvedValueOnce({ _id: 6 });
      mockSave
        .mockRejectedValueOnce(duplicateKeyError({ _id: 1 }))
        .mockResolvedValueOnce(undefined);

      const id = await repository.create(new Vehicle('VAN-12', VehicleType.VAN, 4));

      expect(id).toBe(7);
      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    it('should throw a conflict after exhausting id retries', async () => {
      mockLean.mockResolvedValue({ _id: 5 });
      mockSave.mockRejectedValue(duplicateKeyError({ _id: 1 }));

      await expect(
        repository.create(new Vehicle('VAN-12', VehicleType.VAN, 4))
      ).rejects.toMatchObject({ status: 409 });
      expect(mockSave).toHaveBeenCalledTimes(5);
    });

    it('should propagate non-duplicate errors', async () => {
      mockLean.mockResolvedValueOnce({ _id: 5 });
      mockSave.mockRejectedValueOnce(new Error('db down'));

      await expect(repository.create(new Vehicle('VAN-12', VehicleType.VAN, 4))).rejects.toThrow(
        'db down'
      );
    });
  });

  describe('update', () => {
    it('should set only provided fields and succeed', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.update(6, { available: false, capacity: 6 });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 6 },
        { $set: { capacity: 6, available: false } }
      );
    });

    it('should set all fields when provided', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.update(6, {
        licensePlate: 'X',
        type: VehicleType.TRUCK,
        capacity: 8,
        available: true,
        deviceId: 'dev-9',
        characteristics: { armored: true },
      });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 6 },
        {
          $set: {
            licensePlate: 'X',
            type: VehicleType.TRUCK,
            capacity: 8,
            available: true,
            deviceId: 'dev-9',
            characteristics: { armored: true },
          },
        }
      );
    });

    it('should throw a conflict on 11000', async () => {
      mockUpdateOne.mockRejectedValueOnce(duplicateKeyError({ deviceId: 1 }));

      await expect(repository.update(6, { deviceId: 'dup' })).rejects.toMatchObject({
        status: 409,
      });
    });

    it('should propagate non-duplicate update errors', async () => {
      mockUpdateOne.mockRejectedValueOnce(new Error('db down'));

      await expect(repository.update(6, { available: true })).rejects.toThrow('db down');
    });

    it('should throw 404 when no document matches', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(repository.update(999, { available: true })).rejects.toMatchObject({
        status: 404,
      });
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
