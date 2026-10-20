jest.mock('@move/logs-lib', () => ({
  incrementBusinessEvent: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { incrementBusinessEvent } from '@move/logs-lib';
import { CreateBookingCommand } from '../../../../../src/application/commands/create-booking/create-booking.command';
import { CreateBookingHandler } from '../../../../../src/application/commands/create-booking/create-booking.handler';
import type { ItemClassifier } from '../../../../../src/application/contracts/item-classifier';
import type { PendingClassificationPublisher } from '../../../../../src/application/contracts/pending-classification.publisher';
import { Booking } from '../../../../../src/domain/entities/booking';
import { BookingCustomerType } from '../../../../../src/domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../../../src/domain/enums/booking-performance-tier';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';
import { ItemSize } from '../../../../../src/domain/enums/item-size';
import type { IBookingWriteRepository } from '../../../../../src/domain/repositories/booking.write.repository';

describe('CreateBookingHandler', () => {
  let mockWriteRepository: jest.Mocked<IBookingWriteRepository>;
  let mockItemClassifier: jest.Mocked<ItemClassifier>;
  let mockPendingClassificationPublisher: jest.Mocked<PendingClassificationPublisher>;
  let handler: CreateBookingHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      classifyManually: jest.fn(),
      getPendingClassification: jest.fn(),
      deletePendingClassification: jest.fn(),
      getClassified: jest.fn(),
      setQuote: jest.fn(),
      getPayable: jest.fn(),
      markPaid: jest.fn(),
      recordPayment: jest.fn(),
      recordAssignedResources: jest.fn(),
    };
    mockItemClassifier = {
      classify: jest.fn().mockResolvedValue({
        recognized: true,
        items: [{ index: 0, category: 'furniture' }],
      }),
    };
    mockPendingClassificationPublisher = {
      publishPendingClassification: jest.fn().mockResolvedValue(undefined),
    };
    handler = new CreateBookingHandler(
      mockWriteRepository,
      mockItemClassifier,
      mockPendingClassificationPublisher
    );
  });

  it('should create a booking with classified items', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2999-07-10',
      [{ description: 'Mesa de madera', value: '1500', size: ItemSize.MEDIUM }]
    );

    mockWriteRepository.create.mockResolvedValueOnce();

    const returnedBookingId = await handler.execute(command);

    expect(mockItemClassifier.classify).toHaveBeenCalledWith(command.items);
    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(passedBooking).toBeInstanceOf(Booking);
    expect(passedBooking.id).toEqual(expect.any(String));
    expect(returnedBookingId).toBe(passedBooking.id);
    expect(passedBooking.userId).toBe('usr_123');
    expect(passedBooking.origin).toEqual([-56.16, -34.9]);
    expect(passedBooking.destination).toEqual([-56.03, -34.83]);
    expect(passedBooking.date).toBe('2999-07-10');
    expect(passedBooking.category).toBe('furniture');
    expect(passedBooking.status).toBe(BookingStatus.CLASSIFIED);
    expect(passedBooking.customerType).toBe(BookingCustomerType.INDIVIDUAL);
    expect(passedBooking.performanceTier).toBe(BookingPerformanceTier.INDIVIDUAL);
    expect(incrementBusinessEvent).toHaveBeenCalledWith(
      'booking_classification_completed',
      BookingPerformanceTier.INDIVIDUAL
    );
    expect(passedBooking.items).toHaveLength(1);
    expect(passedBooking.items[0].id).toEqual(expect.any(String));
    expect(passedBooking.items[0].description).toBe('Mesa de madera');
    expect(passedBooking.items[0].category).toBe('furniture');
    expect(passedBooking.items[0].value).toBe('1500');
    expect(passedBooking.items[0].size).toBe(ItemSize.MEDIUM);
    expect(mockPendingClassificationPublisher.publishPendingClassification).not.toHaveBeenCalled();
  });

  it('should assign categories by item index', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2999-07-10',
      [{ description: 'Mesa' }, { description: 'Caja' }]
    );
    mockItemClassifier.classify.mockResolvedValueOnce({
      recognized: true,
      items: [
        { index: 0, category: 'furniture' },
        { index: 1, category: 'boxes' },
      ],
    });
    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(passedBooking.category).toBe('furniture');
    expect(passedBooking.status).toBe(BookingStatus.CLASSIFIED);
    expect(passedBooking.items[0].category).toBe('furniture');
    expect(passedBooking.items[1].category).toBe('boxes');
  });

  it('should create a pending classification booking when classifier does not recognize items', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2999-07-10',
      [{ description: 'Objeto desconocido', value: '500', size: ItemSize.SMALL }]
    );
    mockItemClassifier.classify.mockResolvedValueOnce({ recognized: false, items: [] });
    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(passedBooking.category).toBeUndefined();
    expect(passedBooking.status).toBe(BookingStatus.PENDING_CLASSIFICATION);
    expect(passedBooking.customerType).toBe(BookingCustomerType.INDIVIDUAL);
    expect(passedBooking.performanceTier).toBe(BookingPerformanceTier.INDIVIDUAL);
    expect(passedBooking.items[0].category).toBeUndefined();
    expect(mockPendingClassificationPublisher.publishPendingClassification).toHaveBeenCalledTimes(
      1
    );
    expect(mockPendingClassificationPublisher.publishPendingClassification).toHaveBeenCalledWith({
      bookingId: passedBooking.id,
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2999-07-10',
      status: BookingStatus.PENDING_CLASSIFICATION,
      items: [
        {
          id: passedBooking.items[0].id,
          description: 'Objeto desconocido',
          value: '500',
          size: ItemSize.SMALL,
        },
      ],
    });
    expect(mockWriteRepository.create.mock.invocationCallOrder[0]).toBeLessThan(
      mockPendingClassificationPublisher.publishPendingClassification.mock.invocationCallOrder[0]
    );
  });

  it('should create a pending classification booking when classifier fails', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2999-07-10',
      [{ description: 'Mesa de madera' }]
    );
    mockItemClassifier.classify.mockRejectedValueOnce(new Error('Gemini failed'));
    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(passedBooking.status).toBe(BookingStatus.PENDING_CLASSIFICATION);
    expect(mockPendingClassificationPublisher.publishPendingClassification).toHaveBeenCalledTimes(
      1
    );
  });

  it('should not fail when pending classification publishing rejects', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2999-07-10',
      [{ description: 'Objeto desconocido' }]
    );
    mockItemClassifier.classify.mockResolvedValueOnce({ recognized: false, items: [] });
    mockWriteRepository.create.mockResolvedValueOnce();
    mockPendingClassificationPublisher.publishPendingClassification.mockRejectedValueOnce(
      new Error('BullMQ failed')
    );

    await expect(handler.execute(command)).resolves.toEqual(expect.any(String));

    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(passedBooking.status).toBe(BookingStatus.PENDING_CLASSIFICATION);
    expect(mockPendingClassificationPublisher.publishPendingClassification).toHaveBeenCalledTimes(
      1
    );
  });

  it('should reject a booking without items', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2999-07-10',
      []
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'at least one item is required',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking with a past date', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2020-07-10',
      [{ description: 'Mesa de madera' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'date must be in the future',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking with an invalid date', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      'invalid-date',
      [{ description: 'Mesa de madera' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'date must be a valid date',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      field: 'origin',
      command: {
        userId: 'usr_123',
        origin: 123,
        destination: [-56.03, -34.83],
        date: '2999-07-10',
        items: [{ description: 'Mesa de madera' }],
      },
      message: 'origin must be [lng, lat] within valid ranges',
    },
    {
      field: 'destination',
      command: {
        userId: 'usr_123',
        origin: [-56.16, -34.9],
        destination: 123,
        date: '2999-07-10',
        items: [{ description: 'Mesa de madera' }],
      },
      message: 'destination must be [lng, lat] within valid ranges',
    },
    {
      field: 'date',
      command: {
        userId: 'usr_123',
        origin: [-56.16, -34.9],
        destination: [-56.03, -34.83],
        date: 123,
        items: [{ description: 'Mesa de madera' }],
      },
      message: 'date must be a valid date',
    },
  ])('should reject a booking with invalid $field type', async ({ command, message }) => {
    await expect(handler.execute(command as unknown as CreateBookingCommand)).rejects.toMatchObject(
      {
        message,
        status: 400,
      }
    );
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking when items is not an array', async () => {
    const command = {
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2999-07-10',
      items: {},
    } as unknown as CreateBookingCommand;

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'at least one item is required',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking when an item is not an object', async () => {
    const command = {
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2999-07-10',
      items: ['invalid'],
    } as unknown as CreateBookingCommand;

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'item must be an object',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking with invalid item value type', async () => {
    const command = {
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2999-07-10',
      items: [{ description: 'Mesa de madera', value: 1500 }],
    } as unknown as CreateBookingCommand;

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'item value must be a string',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking with invalid item size', async () => {
    const command = {
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2999-07-10',
      items: [{ description: 'Mesa de madera', size: 'extra-large' }],
    } as unknown as CreateBookingCommand;

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'item size is invalid',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      field: 'userId',
      command: new CreateBookingCommand('   ', [-56.16, -34.9], [-56.03, -34.83], '2999-07-10', [
        { description: 'Mesa de madera' },
      ]),
      message: 'userId is required and cannot be empty or whitespace',
    },
    {
      field: 'origin',
      command: new CreateBookingCommand(
        'usr_123',
        [] as unknown as [number, number],
        [-56.03, -34.83],
        '2999-07-10',
        [{ description: 'Mesa de madera' }]
      ),
      message: 'origin must be [lng, lat] within valid ranges',
    },
    {
      field: 'destination',
      command: new CreateBookingCommand(
        'usr_123',
        [-56.16, -34.9],
        [] as unknown as [number, number],
        '2999-07-10',
        [{ description: 'Mesa de madera' }]
      ),
      message: 'destination must be [lng, lat] within valid ranges',
    },
  ])('should reject a booking with an empty $field', async ({ command, message }) => {
    await expect(handler.execute(command)).rejects.toMatchObject({
      message,
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking with an empty item description', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2999-07-10',
      [{ description: '   ' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'item description is required and cannot be empty or whitespace',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should propagate errors thrown by the repository', async () => {
    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2999-07-10',
      [{ description: 'Mesa de madera' }]
    );

    const dbError = new Error('Database insertion failed');
    mockWriteRepository.create.mockRejectedValueOnce(dbError);

    await expect(handler.execute(command)).rejects.toThrow('Database insertion failed');
    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
    expect(mockPendingClassificationPublisher.publishPendingClassification).not.toHaveBeenCalled();
  });
});
