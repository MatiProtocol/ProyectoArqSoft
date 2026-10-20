import { BookingModel } from '../../../../../src/infrastructure/models/booking.model';
import { BookingReadRepository } from '../../../../../src/infrastructure/repositories/implementations/booking.read.repository';

jest.mock('../../../../../src/infrastructure/models/booking.model', () => ({
  BookingModel: {
    findById: jest.fn(),
  },
}));

const mockedBookingModel = BookingModel as jest.Mocked<typeof BookingModel>;

describe('BookingReadRepository', () => {
  let repository: BookingReadRepository;
  let mockLean: jest.Mock;

  beforeEach(() => {
    repository = new BookingReadRepository();
    jest.clearAllMocks();

    mockLean = jest.fn();
    mockedBookingModel.findById.mockReturnValue({ lean: mockLean } as never);
  });

  it('returns null without querying when the id is not a valid ObjectId', async () => {
    const result = await repository.findById('not-an-object-id');

    expect(result).toBeNull();
    expect(mockedBookingModel.findById).not.toHaveBeenCalled();
  });

  it('returns null when the booking does not exist', async () => {
    mockLean.mockResolvedValueOnce(null);

    const result = await repository.findById('507f1f77bcf86cd799439011');

    expect(mockedBookingModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(result).toBeNull();
  });

  it('maps an existing booking, defaulting items to an empty array', async () => {
    mockLean.mockResolvedValueOnce({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      status: 'payed',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      category: 'electronics',
      items: undefined,
    });

    const result = await repository.findById('507f1f77bcf86cd799439011');

    expect(result).toEqual({
      id: '507f1f77bcf86cd799439011',
      status: 'payed',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      category: 'electronics',
      items: [],
    });
  });

  it('maps booking items to their size', async () => {
    mockLean.mockResolvedValueOnce({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      status: 'payed',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      items: [{ size: 'small' }, { size: 'large' }],
    });

    const result = await repository.findById('507f1f77bcf86cd799439011');

    expect(result?.items).toEqual([{ size: 'small' }, { size: 'large' }]);
  });
});
