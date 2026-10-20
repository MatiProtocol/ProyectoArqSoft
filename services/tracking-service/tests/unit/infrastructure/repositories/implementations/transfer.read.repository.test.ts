import { TransferStatus } from '../../../../../src/domain/enums/transfer-status';
import { TransferModel } from '../../../../../src/infrastructure/models/transfer.model';
import { TransferReadRepository } from '../../../../../src/infrastructure/repositories/implementations/transfer.read.repository';

jest.mock('../../../../../src/infrastructure/models/transfer.model', () => ({
  TransferModel: {
    findById: jest.fn(),
    find: jest.fn(),
    exists: jest.fn(),
  },
}));

const mockedTransferModel = TransferModel as jest.Mocked<typeof TransferModel>;

function buildDocument(overrides: Record<string, unknown> = {}) {
  return {
    _id: 42,
    bookingId: 'b1',
    vehicleId: 1,
    deviceId: 'GPS-001',
    driverId: 'auth0|driver',
    origin: [-56.16, -34.9],
    destination: [-56.03, -34.83],
    status: TransferStatus.ASSIGNED,
    hasActiveAlerts: false,
    ...overrides,
  };
}

describe('TransferReadRepository', () => {
  let repository: TransferReadRepository;
  let mockFindByIdLean: jest.Mock;
  let mockSort: jest.Mock;
  let mockSkip: jest.Mock;
  let mockLimit: jest.Mock;
  let mockFindLean: jest.Mock;

  beforeEach(() => {
    repository = new TransferReadRepository();
    jest.clearAllMocks();

    mockFindByIdLean = jest.fn();
    mockedTransferModel.findById.mockReturnValue({ lean: mockFindByIdLean } as never);

    mockSort = jest.fn().mockReturnThis();
    mockSkip = jest.fn().mockReturnThis();
    mockLimit = jest.fn().mockReturnThis();
    mockFindLean = jest.fn();
    mockedTransferModel.find.mockReturnValue({
      sort: mockSort,
      skip: mockSkip,
      limit: mockLimit,
      lean: mockFindLean,
    } as never);
  });

  describe('findById', () => {
    it('returns null when the transfer does not exist', async () => {
      mockFindByIdLean.mockResolvedValueOnce(null);

      const result = await repository.findById(99);

      expect(mockedTransferModel.findById).toHaveBeenCalledWith(99);
      expect(result).toBeNull();
    });

    it('maps an existing transfer', async () => {
      mockFindByIdLean.mockResolvedValueOnce(buildDocument());

      const result = await repository.findById(42);

      expect(result?.id).toBe(42);
    });
  });

  describe('getActive', () => {
    it('queries only active statuses when no filters are provided', async () => {
      mockFindLean.mockResolvedValueOnce([]);

      await repository.getActive({});

      expect(mockedTransferModel.find).toHaveBeenCalledWith({
        status: { $in: [TransferStatus.ASSIGNED, TransferStatus.IN_PROGRESS] },
      });
      expect(mockSort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('applies all optional filters when provided', async () => {
      mockFindLean.mockResolvedValueOnce([buildDocument()]);

      const result = await repository.getActive({
        vehicleId: 1,
        driverId: 'auth0|driver',
        category: 'electronics',
        hasActiveAlerts: true,
        limit: 10,
        skip: 5,
      });

      expect(mockedTransferModel.find).toHaveBeenCalledWith({
        status: { $in: [TransferStatus.ASSIGNED, TransferStatus.IN_PROGRESS] },
        vehicleId: 1,
        driverId: 'auth0|driver',
        category: 'electronics',
        hasActiveAlerts: true,
      });
      expect(mockSkip).toHaveBeenCalledWith(5);
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });
  });

  describe('existsActiveForVehicle', () => {
    it('returns true when an active transfer exists for the vehicle', async () => {
      mockedTransferModel.exists.mockResolvedValueOnce({ _id: 42 } as never);

      const result = await repository.existsActiveForVehicle(1);

      expect(mockedTransferModel.exists).toHaveBeenCalledWith({
        vehicleId: 1,
        status: { $in: [TransferStatus.ASSIGNED, TransferStatus.IN_PROGRESS] },
      });
      expect(result).toBe(true);
    });

    it('returns false when no active transfer exists for the vehicle', async () => {
      mockedTransferModel.exists.mockResolvedValueOnce(null);

      const result = await repository.existsActiveForVehicle(1);

      expect(result).toBe(false);
    });
  });
});
