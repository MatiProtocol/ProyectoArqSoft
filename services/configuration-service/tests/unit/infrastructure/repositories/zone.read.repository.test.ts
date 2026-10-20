import { ZoneType } from '../../../../src/domain/enums/zone-type';
import { ZoneModel } from '../../../../src/infrastructure/models/zone.model';
import { ZoneReadRepository } from '../../../../src/infrastructure/repositories/zone.read.repository';

const mockLean = jest.fn();
const mockLimit = jest.fn();
const mockSkip = jest.fn();
const mockSort = jest.fn();

jest.mock('../../../../src/infrastructure/models/zone.model', () => ({
  ZoneModel: { find: jest.fn() },
}));

const mockFind = (ZoneModel as unknown as { find: jest.Mock }).find;

const ring = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];
const zoneDoc = {
  _id: 1,
  name: 'Centro',
  type: ZoneType.RED_ZONE,
  polygon: { type: 'Polygon', coordinates: [ring] },
};

describe('ZoneReadRepository', () => {
  let repository: ZoneReadRepository;

  beforeEach(() => {
    repository = new ZoneReadRepository();
    jest.clearAllMocks();
    mockSort.mockReturnValue({ skip: mockSkip });
    mockSkip.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ lean: mockLean });
    mockFind.mockReturnValue({ sort: mockSort });
  });

  it('should query without filter and map results (flattened coordinates, numeric id)', async () => {
    mockLean.mockResolvedValueOnce([zoneDoc]);

    const result = await repository.getAll({});

    expect(mockFind).toHaveBeenCalledWith({});
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toEqual([{ id: 1, name: 'Centro', type: ZoneType.RED_ZONE, coordinates: ring }]);
  });

  it('should apply type filter and pagination', async () => {
    mockLean.mockResolvedValueOnce([]);

    await repository.getAll({ type: ZoneType.RED_ZONE, limit: 10, skip: 5 });

    expect(mockFind).toHaveBeenCalledWith({ type: ZoneType.RED_ZONE });
    expect(mockSkip).toHaveBeenCalledWith(5);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });
});
