import { RegisteredDeviceCache } from '../../../../src/infrastructure/cache/registered-devices.cache';
import { VehicleModel } from '../../../../src/infrastructure/models/vehicle.model';

jest.mock('../../../../src/infrastructure/models/vehicle.model', () => ({
  VehicleModel: {
    exists: jest.fn(),
    find: jest.fn(),
  },
}));

const mockedVehicleModel = VehicleModel as jest.Mocked<typeof VehicleModel>;

describe('RegisteredDeviceCache', () => {
  let mockSelect: jest.Mock;
  let mockLean: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    mockLean = jest.fn().mockResolvedValue([]);
    mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
    mockedVehicleModel.find.mockReturnValue({ select: mockSelect } as never);
  });

  it('refreshes from the vehicles collection on first use and caches registered devices', async () => {
    mockLean.mockResolvedValueOnce([{ deviceId: 'GPS-001' }, { deviceId: 'GPS-002' }]);
    const cache = new RegisteredDeviceCache();

    const result = await cache.isRegistered('GPS-001');

    expect(mockedVehicleModel.find).toHaveBeenCalledWith({
      deviceId: { $exists: true, $ne: null },
    });
    expect(mockSelect).toHaveBeenCalledWith('deviceId');
    expect(result).toBe(true);
    expect(mockedVehicleModel.exists).not.toHaveBeenCalled();
  });

  it('filters out vehicles without a deviceId when refreshing', async () => {
    mockLean.mockResolvedValueOnce([{ deviceId: 'GPS-001' }, { deviceId: undefined }]);
    const cache = new RegisteredDeviceCache();

    await cache.isRegistered('GPS-001');
    mockedVehicleModel.exists.mockResolvedValueOnce(null);
    const result = await cache.isRegistered('unknown-device');

    expect(result).toBe(false);
  });

  it('falls back to a direct lookup on a cache miss and caches a hit', async () => {
    const cache = new RegisteredDeviceCache();
    mockedVehicleModel.exists.mockResolvedValueOnce({ _id: 1 } as never);

    const result = await cache.isRegistered('GPS-NEW');

    expect(mockedVehicleModel.exists).toHaveBeenCalledWith({ deviceId: 'GPS-NEW' });
    expect(result).toBe(true);

    const secondResult = await cache.isRegistered('GPS-NEW');
    expect(secondResult).toBe(true);
  });

  it('returns false when the device is not found in the fallback lookup', async () => {
    const cache = new RegisteredDeviceCache();
    mockedVehicleModel.exists.mockResolvedValueOnce(null);

    const result = await cache.isRegistered('GPS-UNKNOWN');

    expect(result).toBe(false);
  });

  it('does not refresh again before the TTL expires', async () => {
    const cache = new RegisteredDeviceCache(60000);
    await cache.isRegistered('GPS-001');
    mockedVehicleModel.find.mockClear();

    mockedVehicleModel.exists.mockResolvedValueOnce(null);
    await cache.isRegistered('GPS-002');

    expect(mockedVehicleModel.find).not.toHaveBeenCalled();
  });

  it('refreshes again after the TTL expires', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(100000);
    const cache = new RegisteredDeviceCache(60000);

    await cache.isRegistered('GPS-001');
    mockedVehicleModel.exists.mockResolvedValueOnce(null);
    await cache.isRegistered('GPS-002');

    expect(mockedVehicleModel.find).toHaveBeenCalledTimes(2);
  });
});
