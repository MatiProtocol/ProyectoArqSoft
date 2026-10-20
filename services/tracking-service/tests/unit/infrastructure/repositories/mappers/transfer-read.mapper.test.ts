import { TransferStatus } from '../../../../../src/domain/enums/transfer-status';
import type { TransferDocument } from '../../../../../src/infrastructure/models/transfer.model';
import { toTransferReadDto } from '../../../../../src/infrastructure/repositories/mappers/transfer-read.mapper';

function buildDocument(overrides: Partial<TransferDocument> = {}): TransferDocument {
  return {
    _id: 42,
    bookingId: 'b1',
    vehicleId: 1,
    deviceId: 'GPS-001',
    driverId: 'auth0|driver',
    origin: [-56.16, -34.9],
    destination: [-56.03, -34.83],
    category: 'electronics',
    status: TransferStatus.ASSIGNED,
    vehicleLabel: 'VAN-12',
    driverName: 'Laura',
    hasActiveAlerts: false,
    ...overrides,
  };
}

describe('toTransferReadDto', () => {
  it('maps a transfer document without a last position', () => {
    const dto = toTransferReadDto(buildDocument());

    expect(dto).toEqual({
      id: 42,
      bookingId: 'b1',
      vehicleId: 1,
      deviceId: 'GPS-001',
      driverId: 'auth0|driver',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      category: 'electronics',
      status: TransferStatus.ASSIGNED,
      vehicleLabel: 'VAN-12',
      driverName: 'Laura',
      hasActiveAlerts: false,
      startedAt: undefined,
      finishedAt: undefined,
      lastPosition: undefined,
    });
  });

  it('maps startedAt and finishedAt to ISO strings', () => {
    const dto = toTransferReadDto(
      buildDocument({
        startedAt: new Date('2026-06-23T10:00:00.000Z'),
        finishedAt: new Date('2026-06-23T11:00:00.000Z'),
      })
    );

    expect(dto.startedAt).toBe('2026-06-23T10:00:00.000Z');
    expect(dto.finishedAt).toBe('2026-06-23T11:00:00.000Z');
  });

  it('maps the last position when present', () => {
    const dto = toTransferReadDto(
      buildDocument({
        lastPosition: { type: 'Point', coordinates: [-56.16, -34.9] },
        lastPositionAt: new Date('2026-06-23T10:05:00.000Z'),
      })
    );

    expect(dto.lastPosition).toEqual({
      coordinates: [-56.16, -34.9],
      at: '2026-06-23T10:05:00.000Z',
    });
  });

  it('omits the last position when lastPositionAt is missing', () => {
    const dto = toTransferReadDto(
      buildDocument({
        lastPosition: { type: 'Point', coordinates: [-56.16, -34.9] },
      })
    );

    expect(dto.lastPosition).toBeUndefined();
  });
});
