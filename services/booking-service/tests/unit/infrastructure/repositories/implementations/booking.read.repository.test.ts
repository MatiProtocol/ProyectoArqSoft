import { BookingStatusDto } from '../../../../../src/application/dtos/enums/booking-status.dto';
import { ItemSizeDto } from '../../../../../src/application/dtos/enums/item-size.dto';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';
import { ItemSize } from '../../../../../src/domain/enums/item-size';
import { BookingModel } from '../../../../../src/infrastructure/models/booking.model';
import { BookingReadRepository } from '../../../../../src/infrastructure/repositories/implementations/booking.read.repository';

jest.mock('../../../../../src/infrastructure/models/booking.model', () => ({
  BookingModel: {
    find: jest.fn(),
  },
}));

const mockedBookingModel = BookingModel as jest.Mocked<typeof BookingModel>;

describe('BookingReadRepository', () => {
  let repository: BookingReadRepository;
  let mockSort: jest.Mock;
  let mockSkip: jest.Mock;
  let mockLimit: jest.Mock;
  let mockBookingLean: jest.Mock;

  beforeEach(() => {
    repository = new BookingReadRepository();
    jest.clearAllMocks();

    mockSort = jest.fn().mockReturnThis();
    mockSkip = jest.fn().mockReturnThis();
    mockLimit = jest.fn().mockReturnThis();
    mockBookingLean = jest.fn();

    mockedBookingModel.find.mockReturnValue({
      sort: mockSort,
      skip: mockSkip,
      limit: mockLimit,
      lean: mockBookingLean,
    } as never);
  });

  it('should return bookings matching the provided filter', async () => {
    const dateFrom = new Date('2026-07-01');
    const dateTo = new Date('2026-07-31');
    const bookingDocument = {
      _id: 'bkg_123',
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: new Date('2026-07-10'),
      items: [
        {
          _id: 'itm_123',
          description: 'Mesa de madera',
          category: 'furniture',
          value: '1500',
          size: ItemSize.MEDIUM,
        },
      ],
      category: 'furniture',
      status: BookingStatus.CLASSIFIED,
      assignedResources: {
        transferId: 42,
        vehicleId: 1,
        deviceId: 'GPS-001',
        driverId: 'auth0|driver',
        vehicleLabel: 'VAN-12',
        driverName: 'Laura',
        status: 'assigned',
        assignedAt: '2026-07-10T12:00:00.000Z',
      },
    };

    mockBookingLean.mockResolvedValueOnce([bookingDocument]);

    const result = await repository.getAll({
      userId: 'usr_123',
      status: BookingStatus.CLASSIFIED,
      category: 'furniture',
      dateFrom,
      dateTo,
      limit: 5,
      skip: 10,
    });

    expect(mockedBookingModel.find).toHaveBeenCalledWith({
      userId: 'usr_123',
      status: BookingStatus.CLASSIFIED,
      category: 'furniture',
      date: { $gte: dateFrom, $lte: dateTo },
    });
    expect(mockSort).toHaveBeenCalledWith({ date: 1 });
    expect(mockSkip).toHaveBeenCalledWith(10);
    expect(mockLimit).toHaveBeenCalledWith(5);
    expect(mockBookingLean).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: 'bkg_123',
        userId: 'usr_123',
        origin: [-56.16, -34.9],
        destination: [-56.03, -34.83],
        date: '2026-07-10T00:00:00.000Z',
        items: [
          {
            id: 'itm_123',
            description: 'Mesa de madera',
            category: 'furniture',
            value: '1500',
            size: ItemSizeDto.MEDIUM,
          },
        ],
        category: 'furniture',
        status: BookingStatusDto.CLASSIFIED,
        assignedResources: bookingDocument.assignedResources,
      },
    ]);
  });

  it('should return an empty array when no bookings are found', async () => {
    mockBookingLean.mockResolvedValueOnce([]);

    const result = await repository.getAll({});

    expect(mockedBookingModel.find).toHaveBeenCalledWith({});
    expect(mockSort).toHaveBeenCalledWith({ date: 1 });
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(mockBookingLean).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('should filter only by dateFrom when dateTo is not provided', async () => {
    const dateFrom = new Date('2026-07-01');

    mockBookingLean.mockResolvedValueOnce([]);

    await repository.getAll({ dateFrom });

    expect(mockedBookingModel.find).toHaveBeenCalledWith({
      date: { $gte: dateFrom },
    });
  });

  it('should filter only by dateTo when dateFrom is not provided', async () => {
    const dateTo = new Date('2026-07-31');

    mockBookingLean.mockResolvedValueOnce([]);

    await repository.getAll({ dateTo });

    expect(mockedBookingModel.find).toHaveBeenCalledWith({
      date: { $lte: dateTo },
    });
  });

  it('should use the provided limit', async () => {
    mockBookingLean.mockResolvedValueOnce([]);

    await repository.getAll({ limit: 50 });

    expect(mockLimit).toHaveBeenCalledWith(50);
  });

  it('should return embedded items for each booking', async () => {
    const bookingDocuments = [
      {
        _id: 'bkg_123',
        userId: 'usr_123',
        origin: [-56.16, -34.9],
        destination: [-56.03, -34.83],
        date: new Date('2026-07-10'),
        items: [
          {
            _id: 'itm_123',
            description: 'Mesa de madera',
            category: 'furniture',
            value: '1500',
            size: ItemSize.MEDIUM,
          },
          {
            _id: 'itm_456',
            description: 'Silla',
            category: 'furniture',
            value: '300',
            size: ItemSize.SMALL,
          },
        ],
        category: 'furniture',
        status: BookingStatus.CLASSIFIED,
      },
      {
        _id: 'bkg_456',
        userId: 'usr_456',
        origin: 'Salto',
        destination: 'Paysandu',
        date: new Date('2026-07-11'),
        items: [
          {
            _id: 'itm_789',
            description: 'Caja',
            category: 'boxes',
            value: undefined,
            size: ItemSize.SMALL,
          },
        ],
        category: 'boxes',
        status: BookingStatus.PENDING_CLASSIFICATION,
      },
    ];

    mockBookingLean.mockResolvedValueOnce(bookingDocuments);

    const result = await repository.getAll({});

    expect(result[0].items).toEqual([
      {
        id: 'itm_123',
        description: 'Mesa de madera',
        category: 'furniture',
        value: '1500',
        size: ItemSizeDto.MEDIUM,
      },
      {
        id: 'itm_456',
        description: 'Silla',
        category: 'furniture',
        value: '300',
        size: ItemSizeDto.SMALL,
      },
    ]);
    expect(result[1].items).toEqual([
      {
        id: 'itm_789',
        description: 'Caja',
        category: 'boxes',
        value: undefined,
        size: ItemSizeDto.SMALL,
      },
    ]);
  });
});
