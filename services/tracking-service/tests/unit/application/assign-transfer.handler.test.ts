jest.mock('@move/logs-lib', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { AssignTransferCommand } from '../../../src/application/commands/assign-transfer/assign-transfer.command';
import { AssignTransferHandler } from '../../../src/application/commands/assign-transfer/assign-transfer.handler';
import type {
  BookingInfo,
  IBookingReadRepository,
} from '../../../src/application/contracts/booking.read.repository';
import type { ITransferReadRepository } from '../../../src/application/contracts/transfer.read.repository';
import type { ITransferAssignedPublisher } from '../../../src/application/contracts/transfer-assigned.publisher';
import type {
  IVehicleReadRepository,
  VehicleInfo,
} from '../../../src/application/contracts/vehicle.read.repository';
import { TransferStatus } from '../../../src/domain/enums/transfer-status';
import type { ITransferWriteRepository } from '../../../src/domain/repositories/transfer.write.repository';

function buildBooking(overrides: Partial<BookingInfo> = {}): BookingInfo {
  return {
    id: '507f1f77bcf86cd799439011',
    status: 'payed',
    origin: [-56.16, -34.9],
    destination: [-56.03, -34.83],
    category: 'electronics',
    items: [{ size: 'small' }, { size: 'medium' }],
    ...overrides,
  };
}

function buildVehicle(overrides: Partial<VehicleInfo> = {}): VehicleInfo {
  return {
    id: 1,
    licensePlate: 'VAN-12',
    capacity: 5,
    available: true,
    deviceId: 'GPS-001',
    ...overrides,
  };
}

function setup() {
  const bookingRead: jest.Mocked<IBookingReadRepository> = { findById: jest.fn() };
  const vehicleRead: jest.Mocked<IVehicleReadRepository> = { findById: jest.fn() };
  const transferRead: jest.Mocked<ITransferReadRepository> = {
    findById: jest.fn(),
    getActive: jest.fn(),
    existsActiveForVehicle: jest.fn(),
  };
  const transferWrite: jest.Mocked<ITransferWriteRepository> = {
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateLastPosition: jest.fn(),
    markHasActiveAlerts: jest.fn(),
  };
  const transferAssignedPublisher: jest.Mocked<ITransferAssignedPublisher> = {
    publish: jest.fn(),
  };

  const handler = new AssignTransferHandler(
    bookingRead,
    vehicleRead,
    transferRead,
    transferWrite,
    transferAssignedPublisher
  );
  return {
    handler,
    bookingRead,
    vehicleRead,
    transferRead,
    transferWrite,
    transferAssignedPublisher,
  };
}

const command = new AssignTransferCommand('507f1f77bcf86cd799439011', 1, 'auth0|driver', 'Laura');

describe('AssignTransferCommand.create', () => {
  const validBody = {
    bookingId: '507f1f77bcf86cd799439011',
    vehicleId: 1,
    driverId: 'auth0|driver',
    driverName: 'Laura',
  };

  it('builds a command from a valid body', () => {
    const created = AssignTransferCommand.create(validBody);

    expect(created.bookingId).toBe('507f1f77bcf86cd799439011');
    expect(created.vehicleId).toBe(1);
    expect(created.driverId).toBe('auth0|driver');
    expect(created.driverName).toBe('Laura');
  });

  it('omits driverName when blank', () => {
    const created = AssignTransferCommand.create({ ...validBody, driverName: '   ' });

    expect(created.driverName).toBeUndefined();
  });

  it('rejects a missing bookingId', () => {
    expect(() => AssignTransferCommand.create({ ...validBody, bookingId: '' })).toThrow(
      'bookingId is required'
    );
  });

  it('rejects an invalid vehicleId', () => {
    expect(() => AssignTransferCommand.create({ ...validBody, vehicleId: 'abc' })).toThrow(
      'vehicleId must be a positive integer'
    );
  });

  it('rejects a missing driverId', () => {
    expect(() => AssignTransferCommand.create({ ...validBody, driverId: '' })).toThrow(
      'driverId is required'
    );
  });

  it('defaults to an empty body when none is provided', () => {
    expect(() => AssignTransferCommand.create(undefined)).toThrow('bookingId is required');
  });
});

describe('AssignTransferHandler', () => {
  it('creates an ASSIGNED transfer for a paid booking and available vehicle', async () => {
    const {
      handler,
      bookingRead,
      vehicleRead,
      transferRead,
      transferWrite,
      transferAssignedPublisher,
    } = setup();
    bookingRead.findById.mockResolvedValue(buildBooking());
    vehicleRead.findById.mockResolvedValue(buildVehicle());
    transferRead.existsActiveForVehicle.mockResolvedValue(false);
    transferWrite.create.mockResolvedValue(42);

    const id = await handler.execute(command);

    expect(id).toBe(42);
    expect(transferWrite.create).toHaveBeenCalledTimes(1);
    const created = transferWrite.create.mock.calls[0][0];
    expect(created.status).toBe(TransferStatus.ASSIGNED);
    expect(created.vehicleLabel).toBe('VAN-12');
    expect(created.deviceId).toBe('GPS-001');
    expect(created.driverName).toBe('Laura');
    expect(transferAssignedPublisher.publish).toHaveBeenCalledWith({
      bookingId: '507f1f77bcf86cd799439011',
      transferId: 42,
      vehicleId: 1,
      deviceId: 'GPS-001',
      driverId: 'auth0|driver',
      vehicleLabel: 'VAN-12',
      driverName: 'Laura',
      status: 'assigned',
      assignedAt: expect.any(String),
    });
  });

  it('rejects when booking does not exist', async () => {
    const { handler, bookingRead } = setup();
    bookingRead.findById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects when booking is not paid', async () => {
    const { handler, bookingRead } = setup();
    bookingRead.findById.mockResolvedValue(buildBooking({ status: 'pending_payment' }));

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 400 });
  });

  it('rejects when the vehicle does not exist', async () => {
    const { handler, bookingRead, vehicleRead } = setup();
    bookingRead.findById.mockResolvedValue(buildBooking());
    vehicleRead.findById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects when the vehicle is not available', async () => {
    const { handler, bookingRead, vehicleRead } = setup();
    bookingRead.findById.mockResolvedValue(buildBooking());
    vehicleRead.findById.mockResolvedValue(buildVehicle({ available: false }));

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 409 });
  });

  it('rejects when vehicle has no GPS device', async () => {
    const { handler, bookingRead, vehicleRead } = setup();
    bookingRead.findById.mockResolvedValue(buildBooking());
    vehicleRead.findById.mockResolvedValue(buildVehicle({ deviceId: undefined }));

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 400 });
  });

  it('rejects when vehicle capacity is insufficient', async () => {
    const { handler, bookingRead, vehicleRead } = setup();
    bookingRead.findById.mockResolvedValue(
      buildBooking({ items: [{ size: 'large' }, { size: 'large' }] })
    );
    vehicleRead.findById.mockResolvedValue(buildVehicle({ capacity: 2 }));

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 409 });
  });

  it('rejects when the vehicle is already on an active transfer', async () => {
    const { handler, bookingRead, vehicleRead, transferRead } = setup();
    bookingRead.findById.mockResolvedValue(buildBooking());
    vehicleRead.findById.mockResolvedValue(buildVehicle());
    transferRead.existsActiveForVehicle.mockResolvedValue(true);

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 409 });
  });
});
