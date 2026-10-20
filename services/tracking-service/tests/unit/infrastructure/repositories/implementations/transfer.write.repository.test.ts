import { MongoServerError } from 'mongodb';
import { Transfer } from '../../../../../src/domain/entities/transfer';
import { TransferStatus } from '../../../../../src/domain/enums/transfer-status';
import { TransferModel } from '../../../../../src/infrastructure/models/transfer.model';
import { TransferWriteRepository } from '../../../../../src/infrastructure/repositories/implementations/transfer.write.repository';

var mockSave: jest.Mock;

jest.mock('../../../../../src/infrastructure/models/transfer.model', () => {
  mockSave = jest.fn();

  return {
    TransferModel: jest.fn().mockImplementation(function (
      this: { data?: unknown; save?: jest.Mock },
      data: unknown
    ) {
      this.data = data;
      this.save = mockSave;
      return this;
    }),
  };
});

function buildTransfer(): Transfer {
  return new Transfer(
    'b1',
    1,
    'GPS-001',
    'auth0|driver',
    [-56.16, -34.9],
    [-56.03, -34.83],
    'electronics',
    TransferStatus.ASSIGNED,
    'VAN-12',
    'Laura',
    false
  );
}

function duplicateKeyError(): MongoServerError {
  const error = new MongoServerError({ message: 'duplicate key', code: 11000 });
  error.keyPattern = { _id: 1 };
  return error;
}

describe('TransferWriteRepository', () => {
  let repository: TransferWriteRepository;
  let mockFindOneSelectLean: jest.Mock;
  let mockUpdateOne: jest.Mock;

  beforeEach(() => {
    repository = new TransferWriteRepository();
    jest.clearAllMocks();

    mockFindOneSelectLean = jest.fn().mockResolvedValue(null);
    (TransferModel as unknown as { findOne: jest.Mock }).findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: mockFindOneSelectLean }),
      }),
    });
    mockUpdateOne = jest.fn().mockResolvedValue(undefined);
    (TransferModel as unknown as { updateOne: jest.Mock }).updateOne = mockUpdateOne;
  });

  describe('create', () => {
    it('assigns id 1 when there are no existing transfers', async () => {
      mockSave.mockResolvedValueOnce(undefined);

      const id = await repository.create(buildTransfer());

      expect(id).toBe(1);
      expect(TransferModel).toHaveBeenCalledWith(expect.objectContaining({ _id: 1 }));
    });

    it('assigns last id + 1 when transfers already exist', async () => {
      mockFindOneSelectLean.mockResolvedValueOnce({ _id: 41 });
      mockSave.mockResolvedValueOnce(undefined);

      const id = await repository.create(buildTransfer());

      expect(id).toBe(42);
    });

    it('retries with a new id on a duplicate _id key conflict', async () => {
      mockSave.mockRejectedValueOnce(duplicateKeyError()).mockResolvedValueOnce(undefined);

      const id = await repository.create(buildTransfer());

      expect(id).toBe(1);
      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    it('throws conflict after exhausting all id generation attempts', async () => {
      mockSave.mockRejectedValue(duplicateKeyError());

      await expect(repository.create(buildTransfer())).rejects.toMatchObject({
        message: 'Could not assign a unique id for the new transfer, please retry.',
        status: 409,
      });
      expect(mockSave).toHaveBeenCalledTimes(5);
    });

    it('propagates non-duplicate-key errors immediately', async () => {
      mockSave.mockRejectedValueOnce(new Error('disk full'));

      await expect(repository.create(buildTransfer())).rejects.toThrow('disk full');
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('propagates a MongoServerError with code 11000 on a different key', async () => {
      const error = new MongoServerError({ message: 'duplicate key', code: 11000 });
      error.keyPattern = { deviceId: 1 };
      mockSave.mockRejectedValueOnce(error);

      await expect(repository.create(buildTransfer())).rejects.toBe(error);
    });
  });

  describe('updateStatus', () => {
    it('updates status with startedAt when provided', async () => {
      await repository.updateStatus(42, TransferStatus.IN_PROGRESS, {
        startedAt: '2026-06-23T10:00:00.000Z',
      });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 42 },
        {
          $set: {
            status: TransferStatus.IN_PROGRESS,
            startedAt: new Date('2026-06-23T10:00:00.000Z'),
          },
        }
      );
    });

    it('updates status with finishedAt when provided', async () => {
      await repository.updateStatus(42, TransferStatus.COMPLETED, {
        finishedAt: '2026-06-23T11:00:00.000Z',
      });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 42 },
        {
          $set: {
            status: TransferStatus.COMPLETED,
            finishedAt: new Date('2026-06-23T11:00:00.000Z'),
          },
        }
      );
    });

    it('updates status without timestamps when none are provided', async () => {
      await repository.updateStatus(42, TransferStatus.CANCELLED, {});

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 42 },
        { $set: { status: TransferStatus.CANCELLED } }
      );
    });
  });

  describe('updateLastPosition', () => {
    it('sets the last position and timestamp', async () => {
      await repository.updateLastPosition(42, [-56.16, -34.9], '2026-06-23T10:05:00.000Z');

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 42 },
        {
          $set: {
            lastPosition: { type: 'Point', coordinates: [-56.16, -34.9] },
            lastPositionAt: new Date('2026-06-23T10:05:00.000Z'),
          },
        }
      );
    });
  });

  describe('markHasActiveAlerts', () => {
    it('sets hasActiveAlerts', async () => {
      await repository.markHasActiveAlerts(42, true);

      expect(mockUpdateOne).toHaveBeenCalledWith({ _id: 42 }, { $set: { hasActiveAlerts: true } });
    });
  });
});
