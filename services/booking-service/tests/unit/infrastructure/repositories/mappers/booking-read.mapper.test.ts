import { BookingStatusDto } from '../../../../../src/application/dtos/enums/booking-status.dto';
import { ItemSizeDto } from '../../../../../src/application/dtos/enums/item-size.dto';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';
import { ItemSize } from '../../../../../src/domain/enums/item-size';
import type {
  BookingDocument,
  BookingItemDocument,
} from '../../../../../src/infrastructure/models/booking.model';
import { toBooking } from '../../../../../src/infrastructure/repositories/mappers/booking-domain.mapper';
import {
  toBookingReadDto,
  toItemReadDto,
} from '../../../../../src/infrastructure/repositories/mappers/booking-read.mapper';

describe('BookingReadMapper', () => {
  it('should map an item document to ItemReadDto', () => {
    const itemDocument = {
      _id: 'itm_123',
      description: 'Mesa de madera',
      category: 'furniture',
      value: '1500',
      size: ItemSize.MEDIUM,
    } as unknown as BookingItemDocument;

    const result = toItemReadDto(itemDocument);

    expect(result).toEqual({
      id: 'itm_123',
      description: 'Mesa de madera',
      category: 'furniture',
      value: '1500',
      size: ItemSizeDto.MEDIUM,
    });
  });

  it('should map a booking document to BookingReadDto with items', () => {
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
    } as unknown as BookingDocument;

    const result = toBookingReadDto(bookingDocument);

    expect(result).toEqual({
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
    });
  });

  it('should map a booking document payment field to the read DTO when present', () => {
    const bookingDocument = {
      _id: 'bkg_123',
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: new Date('2026-07-10'),
      items: [],
      category: 'furniture',
      status: BookingStatus.PAYED,
      payment: {
        status: 'accepted',
        amount: 150,
        provider: 'stripe-sim',
        reference: 'ref_1',
        attempts: 1,
        paidAt: '2026-06-25T00:00:00.000Z',
        updatedAt: '2026-06-25T00:00:00.000Z',
      },
    } as unknown as BookingDocument;

    const result = toBookingReadDto(bookingDocument);

    expect(result.payment).toEqual(bookingDocument.payment);
  });

  it('should map a booking document with empty items when no items are found', () => {
    const bookingDocument = {
      _id: 'bkg_123',
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: new Date('2026-07-10'),
      items: [],
      category: 'furniture',
      status: BookingStatus.PENDING_CLASSIFICATION,
    } as unknown as BookingDocument;

    const result = toBookingReadDto(bookingDocument);

    expect(result.items).toEqual([]);
    expect(result.status).toBe(BookingStatusDto.PENDING_CLASSIFICATION);
  });

  it('should map a booking document to domain booking', () => {
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
      payment: {
        status: 'pending',
        amount: 150,
        provider: 'stripe-sim',
        attempts: 1,
        updatedAt: '2026-06-25T00:00:00.000Z',
      },
    } as unknown as BookingDocument;

    const result = toBooking(bookingDocument);

    expect(result).toMatchObject({
      id: 'bkg_123',
      userId: 'usr_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2026-07-10T00:00:00.000Z',
      category: 'furniture',
      status: BookingStatus.CLASSIFIED,
      payment: bookingDocument.payment,
    });
    expect(result.items[0]).toMatchObject({
      id: 'itm_123',
      description: 'Mesa de madera',
      category: 'furniture',
      value: '1500',
      size: ItemSize.MEDIUM,
    });
  });
});
