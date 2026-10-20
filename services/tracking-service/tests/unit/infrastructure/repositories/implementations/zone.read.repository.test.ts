import { ZoneModel } from '../../../../../src/infrastructure/models/zone.model';
import { ZoneReadRepository } from '../../../../../src/infrastructure/repositories/implementations/zone.read.repository';

jest.mock('../../../../../src/infrastructure/models/zone.model', () => ({
  ZoneModel: {
    find: jest.fn(),
  },
}));

const mockedZoneModel = ZoneModel as jest.Mocked<typeof ZoneModel>;

describe('ZoneReadRepository', () => {
  let repository: ZoneReadRepository;
  let mockSelect: jest.Mock;
  let mockLean: jest.Mock;

  beforeEach(() => {
    repository = new ZoneReadRepository();
    jest.clearAllMocks();

    mockLean = jest.fn();
    mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
    mockedZoneModel.find.mockReturnValue({ select: mockSelect } as never);
  });

  it('queries red zones intersecting the given point', async () => {
    mockLean.mockResolvedValueOnce([]);

    await repository.findRedZonesContaining([-56.16, -34.9]);

    expect(mockedZoneModel.find).toHaveBeenCalledWith({
      type: 'RED_ZONE',
      polygon: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates: [-56.16, -34.9] },
        },
      },
    });
    expect(mockSelect).toHaveBeenCalledWith('_id name');
  });

  it('maps matching red zones', async () => {
    mockLean.mockResolvedValueOnce([{ _id: 7, name: 'Centro' }]);

    const result = await repository.findRedZonesContaining([-56.16, -34.9]);

    expect(result).toEqual([{ id: 7, name: 'Centro' }]);
  });

  it('returns an empty array when no red zones match', async () => {
    mockLean.mockResolvedValueOnce([]);

    const result = await repository.findRedZonesContaining([-56.16, -34.9]);

    expect(result).toEqual([]);
  });
});
