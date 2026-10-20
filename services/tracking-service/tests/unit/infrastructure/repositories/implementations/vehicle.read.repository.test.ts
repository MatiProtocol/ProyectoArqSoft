import { VehicleModel } from '../../../../../src/infrastructure/models/vehicle.model';
import { VehicleReadRepository } from '../../../../../src/infrastructure/repositories/implementations/vehicle.read.repository';

jest.mock('../../../../../src/infrastructure/models/vehicle.model', () => ({
  VehicleModel: {
    findById: jest.fn(),
  },
}));

const mockedVehicleModel = VehicleModel as jest.Mocked<typeof VehicleModel>;

describe('VehicleReadRepository', () => {
  let repository: VehicleReadRepository;
  let mockLean: jest.Mock;

  beforeEach(() => {
    repository = new VehicleReadRepository();
    jest.clearAllMocks();

    mockLean = jest.fn();
    mockedVehicleModel.findById.mockReturnValue({ lean: mockLean } as never);
  });

  it('returns null when the vehicle does not exist', async () => {
    mockLean.mockResolvedValueOnce(null);

    const result = await repository.findById(1);

    expect(mockedVehicleModel.findById).toHaveBeenCalledWith(1);
    expect(result).toBeNull();
  });

  it('maps an existing vehicle', async () => {
    mockLean.mockResolvedValueOnce({
      _id: 1,
      licensePlate: 'VAN-12',
      capacity: 5,
      available: true,
      deviceId: 'GPS-001',
    });

    const result = await repository.findById(1);

    expect(result).toEqual({
      id: 1,
      licensePlate: 'VAN-12',
      capacity: 5,
      available: true,
      deviceId: 'GPS-001',
    });
  });
});
