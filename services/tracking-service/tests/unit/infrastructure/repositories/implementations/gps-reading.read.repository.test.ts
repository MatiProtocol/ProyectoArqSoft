import { GpsReadingModel } from '../../../../../src/infrastructure/models/gps-reading.model';
import { GpsReadingReadRepository } from '../../../../../src/infrastructure/repositories/implementations/gps-reading.read.repository';

jest.mock('../../../../../src/infrastructure/models/gps-reading.model', () => ({
  GpsReadingModel: {
    find: jest.fn(),
  },
}));

const mockedGpsReadingModel = GpsReadingModel as jest.Mocked<typeof GpsReadingModel>;

describe('GpsReadingReadRepository', () => {
  let repository: GpsReadingReadRepository;
  let mockSort: jest.Mock;
  let mockLimit: jest.Mock;
  let mockLean: jest.Mock;

  beforeEach(() => {
    repository = new GpsReadingReadRepository();
    jest.clearAllMocks();

    mockSort = jest.fn().mockReturnThis();
    mockLimit = jest.fn().mockReturnThis();
    mockLean = jest.fn();

    mockedGpsReadingModel.find.mockReturnValue({
      sort: mockSort,
      limit: mockLimit,
      lean: mockLean,
    } as never);
  });

  it('returns the most recent positions for a transfer', async () => {
    mockLean.mockResolvedValueOnce([
      {
        location: { type: 'Point', coordinates: [-56.16, -34.9] },
        timestamp: new Date('2026-06-23T10:00:00.000Z'),
      },
    ]);

    const result = await repository.getRecentByTransfer(7, 50);

    expect(mockedGpsReadingModel.find).toHaveBeenCalledWith({ transferId: 7 });
    expect(mockSort).toHaveBeenCalledWith({ timestamp: -1 });
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toEqual([
      { coordinates: [-56.16, -34.9], timestamp: '2026-06-23T10:00:00.000Z' },
    ]);
  });

  it('returns an empty array when there are no readings', async () => {
    mockLean.mockResolvedValueOnce([]);

    const result = await repository.getRecentByTransfer(7, 50);

    expect(result).toEqual([]);
  });
});
