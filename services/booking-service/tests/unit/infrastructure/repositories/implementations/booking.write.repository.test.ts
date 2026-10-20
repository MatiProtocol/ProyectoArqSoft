import { Booking } from '../../../../../src/domain/entities/booking';
import { Item } from '../../../../../src/domain/entities/item';
import { BookingCustomerType } from '../../../../../src/domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../../../src/domain/enums/booking-performance-tier';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';
import { ItemSize } from '../../../../../src/domain/enums/item-size';
import { PaymentStatus } from '../../../../../src/domain/enums/payment-status';
import { BookingModel } from '../../../../../src/infrastructure/models/booking.model';
import { BookingWriteRepository } from '../../../../../src/infrastructure/repositories/implementations/booking.write.repository';

var mockSave: jest.Mock;
var mockFindById: jest.Mock;
var mockFindOneAndDelete: jest.Mock;
var mockFindOne: jest.Mock;
var mockUpdateOne: jest.Mock;
var mockExists: jest.Mock;

jest.mock('../../../../../src/infrastructure/models/booking.model', () => {
  mockSave = jest.fn();
  mockFindById = jest.fn();
  mockFindOneAndDelete = jest.fn();
  mockFindOne = jest.fn();
  mockUpdateOne = jest.fn();
  mockExists = jest.fn();

  return {
    BookingModel: Object.assign(
      jest.fn().mockImplementation(function (
        this: { data?: unknown; save?: jest.Mock },
        data: unknown
      ) {
        this.data = data;
        this.save = mockSave;
        return this;
      }),
      {
        findById: mockFindById,
        findOneAndDelete: mockFindOneAndDelete,
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
        exists: mockExists,
      }
    ),
  };
});

describe('BookingWriteRepository', () => {
  let repository: BookingWriteRepository;

  beforeEach(() => {
    repository = new BookingWriteRepository();
    jest.clearAllMocks();
  });

  it('should create a booking document with embedded items', async () => {
    const item = new Item('itm_123', 'Mesa de madera', 'furniture', '1500', ItemSize.MEDIUM);
    const booking = new Booking(
      'bkg_123',
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2026-07-10',
      [item],
      'furniture',
      BookingStatus.CLASSIFIED,
      BookingCustomerType.COMPANY,
      BookingPerformanceTier.TOP_COMPANY
    );

    mockSave.mockResolvedValueOnce(undefined);

    await repository.create(booking);

    expect(BookingModel).toHaveBeenCalledWith({
      _id: booking.id,
      userId: booking.userId,
      origin: booking.origin,
      destination: booking.destination,
      date: new Date(booking.date),
      items: [
        {
          _id: item.id,
          description: item.description,
          category: item.category,
          value: item.value,
          size: item.size,
        },
      ],
      category: booking.category,
      status: booking.status,
      customerType: BookingCustomerType.COMPANY,
      performanceTier: BookingPerformanceTier.TOP_COMPANY,
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('should manually classify a pending booking document', async () => {
    const bookingId = '507f1f77bcf86cd799439011';
    const itemId = '507f1f77bcf86cd799439012';
    const bookingDocument = {
      status: BookingStatus.PENDING_CLASSIFICATION,
      category: undefined as string | undefined,
      items: [
        {
          _id: { toString: () => itemId },
          category: undefined as string | undefined,
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindById.mockResolvedValueOnce(bookingDocument);

    await repository.classifyManually(bookingId, [{ itemId, category: 'Furniture' }]);

    expect(mockFindById).toHaveBeenCalledWith(bookingId);
    expect(bookingDocument.items[0].category).toBe('Furniture');
    expect(bookingDocument.category).toBe('Furniture');
    expect(bookingDocument.status).toBe(BookingStatus.CLASSIFIED);
    expect(bookingDocument.save).toHaveBeenCalledTimes(1);
  });

  it('should throw not found when manually classified booking does not exist', async () => {
    mockFindById.mockResolvedValueOnce(null);

    const classification = repository.classifyManually('507f1f77bcf86cd799439011', [
      { itemId: '507f1f77bcf86cd799439012', category: 'Furniture' },
    ]);

    await expect(classification).rejects.toThrow(
      'Booking with identifier "507f1f77bcf86cd799439011" not found'
    );
    await expect(classification).rejects.toMatchObject({
      status: 404,
    });
  });

  it('should reject manual classification when booking is not pending classification', async () => {
    const bookingDocument = {
      status: BookingStatus.CLASSIFIED,
      items: [{ _id: { toString: () => '507f1f77bcf86cd799439012' }, category: 'Furniture' }],
      save: jest.fn(),
    };
    mockFindById.mockResolvedValueOnce(bookingDocument);

    await expect(
      repository.classifyManually('507f1f77bcf86cd799439011', [
        { itemId: '507f1f77bcf86cd799439012', category: 'Furniture' },
      ])
    ).rejects.toMatchObject({
      message: 'Booking is not pending manual classification.',
      status: 409,
    });
    expect(bookingDocument.save).not.toHaveBeenCalled();
  });

  it('should reject manual classification that does not include every booking item', async () => {
    const bookingDocument = {
      status: BookingStatus.PENDING_CLASSIFICATION,
      items: [
        { _id: { toString: () => '507f1f77bcf86cd799439012' }, category: undefined },
        { _id: { toString: () => '507f1f77bcf86cd799439013' }, category: undefined },
      ],
      save: jest.fn(),
    };
    mockFindById.mockResolvedValueOnce(bookingDocument);

    await expect(
      repository.classifyManually('507f1f77bcf86cd799439011', [
        { itemId: '507f1f77bcf86cd799439012', category: 'Furniture' },
      ])
    ).rejects.toMatchObject({
      message: 'manual classification must include every booking item',
      status: 400,
    });
    expect(bookingDocument.save).not.toHaveBeenCalled();
  });

  it('should delete a pending classification booking', async () => {
    const bookingId = '507f1f77bcf86cd799439011';
    const itemId = '507f1f77bcf86cd799439012';
    mockFindOneAndDelete.mockResolvedValueOnce({
      _id: { toString: () => bookingId },
      userId: 'user_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: new Date('2026-07-10T00:00:00.000Z'),
      items: [
        {
          _id: { toString: () => itemId },
          description: 'Objeto no soportado',
          category: undefined,
          value: '100',
          size: ItemSize.SMALL,
        },
      ],
      category: undefined,
      status: BookingStatus.PENDING_CLASSIFICATION,
    });

    const deletedBooking = await repository.deletePendingClassification(bookingId);

    expect(mockFindOneAndDelete).toHaveBeenCalledWith({
      _id: bookingId,
      status: BookingStatus.PENDING_CLASSIFICATION,
    });
    expect(mockFindById).not.toHaveBeenCalled();
    expect(deletedBooking).toMatchObject({
      id: bookingId,
      userId: 'user_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2026-07-10T00:00:00.000Z',
      status: BookingStatus.PENDING_CLASSIFICATION,
    });
    expect(deletedBooking.items[0]).toMatchObject({
      id: itemId,
      description: 'Objeto no soportado',
      value: '100',
      size: ItemSize.SMALL,
    });
  });

  it('should get a pending classification booking', async () => {
    const bookingId = '507f1f77bcf86cd799439011';
    const itemId = '507f1f77bcf86cd799439012';
    mockFindById.mockResolvedValueOnce({
      _id: { toString: () => bookingId },
      userId: 'user_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: new Date('2026-07-10T00:00:00.000Z'),
      items: [
        {
          _id: { toString: () => itemId },
          description: 'Objeto no soportado',
          category: undefined,
          value: '100',
          size: ItemSize.SMALL,
        },
      ],
      category: undefined,
      status: BookingStatus.PENDING_CLASSIFICATION,
    });

    const booking = await repository.getPendingClassification(bookingId);

    expect(mockFindById).toHaveBeenCalledWith(bookingId);
    expect(booking).toMatchObject({
      id: bookingId,
      userId: 'user_123',
      status: BookingStatus.PENDING_CLASSIFICATION,
    });
    expect(booking.items[0]).toMatchObject({
      id: itemId,
      description: 'Objeto no soportado',
    });
  });

  it('should throw not found when rejected booking does not exist', async () => {
    const bookingId = '507f1f77bcf86cd799439011';
    mockFindOneAndDelete.mockResolvedValueOnce(null);
    mockFindById.mockResolvedValueOnce(null);

    await expect(repository.deletePendingClassification(bookingId)).rejects.toMatchObject({
      status: 404,
    });
    expect(mockFindById).toHaveBeenCalledWith(bookingId);
  });

  it('should reject deleting a booking that is not pending classification', async () => {
    const bookingId = '507f1f77bcf86cd799439011';
    mockFindOneAndDelete.mockResolvedValueOnce(null);
    mockFindById.mockResolvedValueOnce({ status: BookingStatus.CLASSIFIED });

    await expect(repository.deletePendingClassification(bookingId)).rejects.toMatchObject({
      message: 'Booking is not pending manual classification.',
      status: 409,
    });
  });

  it('should throw booking already exists error when save fails with duplicate key code 11000', async () => {
    const booking = new Booking(
      'bkg_123',
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2026-07-10',
      [new Item('itm_123', 'Mesa de madera', 'furniture')],
      'furniture',
      BookingStatus.CLASSIFIED
    );

    const duplicateError = Object.assign(new Error('Duplicate key error'), { code: 11000 });
    mockSave.mockRejectedValueOnce(duplicateError);

    await expect(repository.create(booking)).rejects.toMatchObject({
      message: 'Booking already exists.',
      status: 409,
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('should propagate errors thrown by save', async () => {
    const booking = new Booking(
      'bkg_123',
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2026-07-10',
      [new Item('itm_123', 'Mesa de madera', 'furniture')],
      'furniture',
      BookingStatus.CLASSIFIED
    );

    const dbError = new Error('Mongoose validation failed');
    mockSave.mockRejectedValueOnce(dbError);

    await expect(repository.create(booking)).rejects.toThrow('Mongoose validation failed');
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  describe('getPayable', () => {
    const bookingId = '507f1f77bcf86cd799439011';
    const itemId = '507f1f77bcf86cd799439012';

    it('should return the booking when it is pending payment and belongs to the user', async () => {
      mockFindOne.mockResolvedValueOnce({
        _id: { toString: () => bookingId },
        userId: 'user_123',
        origin: [-56.16, -34.9],
        destination: [-56.03, -34.83],
        date: new Date('2026-07-10T00:00:00.000Z'),
        items: [
          {
            _id: { toString: () => itemId },
            description: 'Mesa de madera',
            category: 'furniture',
            value: '100',
            size: ItemSize.SMALL,
          },
        ],
        category: 'furniture',
        status: BookingStatus.PENDING_PAYMENT,
        estimatedCost: 150,
      });

      const booking = await repository.getPayable(bookingId, 'user_123');

      expect(mockFindOne).toHaveBeenCalledWith({
        _id: bookingId,
        userId: 'user_123',
        status: BookingStatus.PENDING_PAYMENT,
      });
      expect(booking).toMatchObject({ id: bookingId, userId: 'user_123', estimatedCost: 150 });
    });

    it('should throw not found when the booking does not exist', async () => {
      mockFindOne.mockResolvedValueOnce(null);
      mockExists.mockResolvedValueOnce(null);

      await expect(repository.getPayable(bookingId, 'user_123')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('should throw conflict when the booking is not pending payment or does not belong to the user', async () => {
      mockFindOne.mockResolvedValueOnce(null);
      mockExists.mockResolvedValueOnce(true);

      await expect(repository.getPayable(bookingId, 'user_123')).rejects.toMatchObject({
        message: 'Booking is not pending payment or does not belong to user.',
        status: 409,
      });
    });
  });

  describe('markPaid', () => {
    const bookingId = '507f1f77bcf86cd799439011';
    const payment = {
      status: PaymentStatus.ACCEPTED,
      amount: 150,
      provider: 'stripe-sim',
      reference: 'ref_1',
      attempts: 1,
      paidAt: '2026-06-25T00:00:00.000Z',
      updatedAt: '2026-06-25T00:00:00.000Z',
    };

    it('should set the payment and mark the booking as payed when it matches', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.markPaid(bookingId, 'user_123', payment);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: bookingId, userId: 'user_123', status: BookingStatus.PENDING_PAYMENT },
        { $set: { payment, status: BookingStatus.PAYED } }
      );
    });

    it('should throw a conflict error when no document matched', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(repository.markPaid(bookingId, 'user_123', payment)).rejects.toMatchObject({
        message: 'Could not update booking payment. State may have changed.',
        status: 409,
      });
    });
  });

  describe('recordPayment', () => {
    const bookingId = '507f1f77bcf86cd799439011';
    const payment = {
      status: PaymentStatus.REJECTED,
      amount: 150,
      provider: 'stripe-sim',
      reference: 'ref_2',
      attempts: 1,
      updatedAt: '2026-06-25T00:00:00.000Z',
    };

    it('should set the payment without changing the booking status', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.recordPayment(bookingId, 'user_123', payment);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: bookingId, userId: 'user_123', status: BookingStatus.PENDING_PAYMENT },
        { $set: { payment } }
      );
    });

    it('should throw a conflict error when no document matched', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(repository.recordPayment(bookingId, 'user_123', payment)).rejects.toMatchObject({
        message: 'Could not update booking payment. State may have changed.',
        status: 409,
      });
    });
  });

  describe('recordAssignedResources', () => {
    const bookingId = '507f1f77bcf86cd799439011';
    const resources = {
      transferId: 42,
      vehicleId: 1,
      deviceId: 'GPS-001',
      driverId: 'auth0|driver',
      vehicleLabel: 'VAN-12',
      driverName: 'Laura',
      status: 'assigned' as const,
      assignedAt: '2026-06-25T00:00:00.000Z',
    };

    it('should record assigned resources on the booking', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.recordAssignedResources(bookingId, resources);

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: bookingId },
        { $set: { assignedResources: resources } }
      );
    });

    it('should throw not found when no booking matched', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(repository.recordAssignedResources(bookingId, resources)).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
