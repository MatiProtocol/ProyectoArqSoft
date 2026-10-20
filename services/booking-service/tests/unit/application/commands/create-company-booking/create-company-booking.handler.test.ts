jest.mock('@move/logs-lib', () => ({
  incrementBusinessEvent: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { incrementBusinessEvent } from '@move/logs-lib';
import { CreateCompanyBookingCommand } from '../../../../../src/application/commands/create-company-booking/create-company-booking.command';
import { CreateCompanyBookingHandler } from '../../../../../src/application/commands/create-company-booking/create-company-booking.handler';
import type { ICompanyPreregistrationReadRepository } from '../../../../../src/application/contracts/company-preregistration.read.repository';
import type { FrequentCompanyClientProvider } from '../../../../../src/application/contracts/frequent-company-client.provider';
import { ItemSizeDto } from '../../../../../src/application/dtos/enums/item-size.dto';
import { Booking } from '../../../../../src/domain/entities/booking';
import { BookingCustomerType } from '../../../../../src/domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../../../src/domain/enums/booking-performance-tier';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';
import { ItemSize } from '../../../../../src/domain/enums/item-size';
import type { IBookingWriteRepository } from '../../../../../src/domain/repositories/booking.write.repository';

describe('CreateCompanyBookingHandler', () => {
  let mockWriteRepository: jest.Mocked<IBookingWriteRepository>;
  let mockPreregistrationReadRepository: jest.Mocked<ICompanyPreregistrationReadRepository>;
  let mockTopCompanyPreregistrationReadRepository: jest.Mocked<ICompanyPreregistrationReadRepository>;
  let mockFrequentCompanyClientProvider: jest.Mocked<FrequentCompanyClientProvider>;
  let handler: CreateCompanyBookingHandler;

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
    mockPreregistrationReadRepository = {
      getByCompanyUserId: jest.fn().mockResolvedValue({
        id: 'pre_123',
        companyUserId: 'company_123',
        origins: [{ id: 'origin_123', coordinates: [-56.16, -34.9] }],
        destinations: [{ id: 'destination_123', coordinates: [-56.03, -34.83] }],
        items: [
          {
            id: 'item_123',
            description: 'Mesa de oficina',
            category: 'furniture',
            value: '1500',
            size: ItemSizeDto.MEDIUM,
          },
          {
            id: 'item_456',
            description: 'Caja de archivos',
            category: 'boxes',
          },
        ],
      }),
    };
    mockFrequentCompanyClientProvider = {
      isFrequentCompanyClient: jest.fn().mockResolvedValue(false),
    };
    mockTopCompanyPreregistrationReadRepository = {
      getByCompanyUserId: jest.fn().mockResolvedValue({
        id: 'pre_123',
        companyUserId: 'company_123',
        origins: [{ id: 'origin_123', coordinates: [-56.16, -34.9] }],
        destinations: [{ id: 'destination_123', coordinates: [-56.03, -34.83] }],
        items: [
          {
            id: 'item_123',
            description: 'Mesa de oficina',
            category: 'furniture',
            value: '1500',
            size: ItemSizeDto.MEDIUM,
          },
        ],
      }),
    };
    handler = new CreateCompanyBookingHandler(
      mockWriteRepository,
      mockPreregistrationReadRepository,
      mockFrequentCompanyClientProvider,
      mockTopCompanyPreregistrationReadRepository
    );
  });

  it('should create a classified booking with preregistered company data', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: 'item_123' }]
    );

    mockWriteRepository.create.mockResolvedValueOnce();

    const returnedBookingId = await handler.execute(command);

    expect(mockPreregistrationReadRepository.getByCompanyUserId).toHaveBeenCalledWith(
      'company_123'
    );
    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(passedBooking).toBeInstanceOf(Booking);
    expect(passedBooking.id).toEqual(expect.any(String));
    expect(returnedBookingId).toBe(passedBooking.id);
    expect(passedBooking.userId).toBe('company_123');
    expect(passedBooking.origin).toEqual([-56.16, -34.9]);
    expect(passedBooking.destination).toEqual([-56.03, -34.83]);
    expect(passedBooking.date).toBe('2999-07-10');
    expect(passedBooking.category).toBe('furniture');
    expect(passedBooking.status).toBe(BookingStatus.CLASSIFIED);
    expect(passedBooking.customerType).toBe(BookingCustomerType.COMPANY);
    expect(passedBooking.performanceTier).toBe(BookingPerformanceTier.COMPANY);
    expect(mockPreregistrationReadRepository.getByCompanyUserId).toHaveBeenCalledWith(
      'company_123'
    );
    expect(mockTopCompanyPreregistrationReadRepository.getByCompanyUserId).not.toHaveBeenCalled();
    expect(incrementBusinessEvent).toHaveBeenCalledWith(
      'booking_classification_completed',
      BookingPerformanceTier.COMPANY
    );
    expect(passedBooking.items).toHaveLength(1);
    expect(passedBooking.items[0].id).toEqual(expect.any(String));
    expect(passedBooking.items[0].description).toBe('Mesa de oficina');
    expect(passedBooking.items[0].category).toBe('furniture');
    expect(passedBooking.items[0].value).toBe('1500');
    expect(passedBooking.items[0].size).toBe(ItemSize.MEDIUM);
  });

  it('should mark top company clients with the top company performance tier', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: 'item_123' }]
    );
    mockFrequentCompanyClientProvider.isFrequentCompanyClient.mockResolvedValueOnce(true);

    await handler.execute(command);

    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(mockFrequentCompanyClientProvider.isFrequentCompanyClient).toHaveBeenCalledWith(
      'company_123'
    );
    expect(mockTopCompanyPreregistrationReadRepository.getByCompanyUserId).toHaveBeenCalledWith(
      'company_123'
    );
    expect(mockPreregistrationReadRepository.getByCompanyUserId).not.toHaveBeenCalled();
    expect(passedBooking.customerType).toBe(BookingCustomerType.COMPANY);
    expect(passedBooking.performanceTier).toBe(BookingPerformanceTier.TOP_COMPANY);
    expect(incrementBusinessEvent).toHaveBeenCalledWith(
      'booking_classification_completed',
      BookingPerformanceTier.TOP_COMPANY
    );
  });

  it('should create a non-frequent company booking when frequency provider fails', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: 'item_123' }]
    );
    mockFrequentCompanyClientProvider.isFrequentCompanyClient.mockRejectedValueOnce(
      new Error('Ranking unavailable')
    );

    await expect(handler.execute(command)).resolves.toEqual(expect.any(String));

    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(passedBooking.customerType).toBe(BookingCustomerType.COMPANY);
    expect(passedBooking.performanceTier).toBe(BookingPerformanceTier.COMPANY);
  });

  it('should use the first preregistered item category as booking category', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: 'item_456' }, { registeredItemId: 'item_123' }]
    );

    mockWriteRepository.create.mockResolvedValueOnce();

    await handler.execute(command);

    const passedBooking = mockWriteRepository.create.mock.calls[0][0];
    expect(passedBooking.category).toBe('boxes');
    expect(passedBooking.items[0].category).toBe('boxes');
    expect(passedBooking.items[1].category).toBe('furniture');
  });

  it('should reject when company preregistration does not exist', async () => {
    mockPreregistrationReadRepository.getByCompanyUserId.mockResolvedValueOnce(undefined);
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: 'item_123' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'company preregistration not found',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject when origin is not preregistered for the company', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'missing_origin',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: 'item_123' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'origin is not preregistered for this company',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject when destination is not preregistered for the company', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'missing_destination',
      '2999-07-10',
      [{ registeredItemId: 'item_123' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'destination is not preregistered for this company',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject when item is not preregistered for the company', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: 'missing_item' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'item is not preregistered for this company',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking without items', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      []
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'at least one item is required',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
    expect(mockPreregistrationReadRepository.getByCompanyUserId).not.toHaveBeenCalled();
  });

  it('should reject a booking with a past date', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2020-07-10',
      [{ registeredItemId: 'item_123' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'date must be in the future',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a booking with an invalid date', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      'invalid-date',
      [{ registeredItemId: 'item_123' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'date must be a valid date',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      field: 'userId',
      command: new CreateCompanyBookingCommand(
        '   ',
        'origin_123',
        'destination_123',
        '2999-07-10',
        [{ registeredItemId: 'item_123' }]
      ),
      message: 'userId is required and cannot be empty or whitespace',
    },
    {
      field: 'originId',
      command: new CreateCompanyBookingCommand(
        'company_123',
        '   ',
        'destination_123',
        '2999-07-10',
        [{ registeredItemId: 'item_123' }]
      ),
      message: 'originId is required and cannot be empty or whitespace',
    },
    {
      field: 'destinationId',
      command: new CreateCompanyBookingCommand('company_123', 'origin_123', '   ', '2999-07-10', [
        { registeredItemId: 'item_123' },
      ]),
      message: 'destinationId is required and cannot be empty or whitespace',
    },
  ])('should reject an empty $field', async ({ command, message }) => {
    await expect(handler.execute(command)).rejects.toMatchObject({
      message,
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject when items is not an array', async () => {
    const command = {
      userId: 'company_123',
      originId: 'origin_123',
      destinationId: 'destination_123',
      date: '2999-07-10',
      items: {},
    } as unknown as CreateCompanyBookingCommand;

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'at least one item is required',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject when an item is not an object', async () => {
    const command = {
      userId: 'company_123',
      originId: 'origin_123',
      destinationId: 'destination_123',
      date: '2999-07-10',
      items: ['invalid'],
    } as unknown as CreateCompanyBookingCommand;

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'item must be an object',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should reject when registeredItemId is empty', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: '   ' }]
    );

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'registeredItemId is required and cannot be empty or whitespace',
      status: 400,
    });
    expect(mockWriteRepository.create).not.toHaveBeenCalled();
  });

  it('should propagate errors thrown by the write repository', async () => {
    const command = new CreateCompanyBookingCommand(
      'company_123',
      'origin_123',
      'destination_123',
      '2999-07-10',
      [{ registeredItemId: 'item_123' }]
    );
    const dbError = new Error('Database insertion failed');
    mockWriteRepository.create.mockRejectedValueOnce(dbError);

    await expect(handler.execute(command)).rejects.toThrow('Database insertion failed');
    expect(mockWriteRepository.create).toHaveBeenCalledTimes(1);
  });
});
