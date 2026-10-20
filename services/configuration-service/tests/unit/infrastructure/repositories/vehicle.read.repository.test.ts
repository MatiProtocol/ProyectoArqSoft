import { VehicleType } from '../../../../src/domain/enums/vehicle-type';
import { VehicleModel } from '../../../../src/infrastructure/models/vehicle.model';
import { VehicleReadRepository } from '../../../../src/infrastructure/repositories/vehicle.read.repository';

const mockLean = jest.fn();
const mockLimit = jest.fn();
const mockSkip = jest.fn();
const mockSort = jest.fn();

jest.mock('../../../../src/infrastructure/models/vehicle.model', () => ({
  VehicleModel: { find: jest.fn() },
}));

const mockFind = (VehicleModel as unknown as { find: jest.Mock }).find;

const vehicleDoc = {
  _id: 1,
  licensePlate: 'VAN-12',
  type: VehicleType.VAN,
  capacity: 4,
  available: true,
  deviceId: 'dev-1',
  characteristics: { refrigerated: true },
};

describe('VehicleReadRepository', () => {
  let repository: VehicleReadRepository;

  beforeEach(() => {
    repository = new VehicleReadRepository();
    jest.clearAllMocks();
    mockSort.mockReturnValue({ skip: mockSkip });
    mockSkip.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ lean: mockLean });
    mockFind.mockReturnValue({ sort: mockSort });
  });

  it('should query without filter and map results (numeric id, defaults for pagination)', async () => {
    mockLean.mockResolvedValueOnce([vehicleDoc]);

    const result = await repository.getAll({});

    expect(mockFind).toHaveBeenCalledWith({});
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toEqual([
      {
        id: 1,
        licensePlate: 'VAN-12',
        type: VehicleType.VAN,
        capacity: 4,
        available: true,
        deviceId: 'dev-1',
        characteristics: { refrigerated: true },
      },
    ]);
  });

  it('should apply available, type and deviceId filters plus pagination', async () => {
    mockLean.mockResolvedValueOnce([]);

    await repository.getAll({
      available: false,
      type: VehicleType.VAN,
      deviceId: 'dev-1',
      limit: 10,
      skip: 5,
    });

    expect(mockFind).toHaveBeenCalledWith({
      available: false,
      type: VehicleType.VAN,
      deviceId: 'dev-1',
    });
    expect(mockSkip).toHaveBeenCalledWith(5);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });
});
