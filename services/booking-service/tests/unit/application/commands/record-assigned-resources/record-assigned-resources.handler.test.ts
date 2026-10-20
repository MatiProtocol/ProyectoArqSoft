jest.mock('@move/logs-lib', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { RecordAssignedResourcesCommand } from '../../../../../src/application/commands/record-assigned-resources/record-assigned-resources.command';
import { RecordAssignedResourcesHandler } from '../../../../../src/application/commands/record-assigned-resources/record-assigned-resources.handler';
import type { IBookingWriteRepository } from '../../../../../src/domain/repositories/booking.write.repository';

describe('RecordAssignedResourcesCommand', () => {
  const event = {
    bookingId: 'booking_1',
    transferId: 42,
    vehicleId: 1,
    deviceId: 'GPS-001',
    driverId: 'auth0|driver',
    vehicleLabel: 'VAN-12',
    driverName: 'Laura',
    status: 'assigned' as const,
    assignedAt: '2026-06-25T00:00:00.000Z',
  };

  it('creates a command from a valid event', () => {
    const command = RecordAssignedResourcesCommand.create(event);

    expect(command.event).toEqual(event);
  });

  it('rejects an invalid event', () => {
    expect(() => RecordAssignedResourcesCommand.create({ ...event, bookingId: '' })).toThrow(
      'bookingId is required'
    );
  });
});

describe('RecordAssignedResourcesHandler', () => {
  it('records assigned resources using the write repository', async () => {
    const repository: jest.Mocked<IBookingWriteRepository> = {
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
    const handler = new RecordAssignedResourcesHandler(repository);
    const command = RecordAssignedResourcesCommand.create({
      bookingId: 'booking_1',
      transferId: 42,
      vehicleId: 1,
      deviceId: 'GPS-001',
      driverId: 'auth0|driver',
      status: 'assigned',
      assignedAt: '2026-06-25T00:00:00.000Z',
    });

    await handler.execute(command);

    expect(repository.recordAssignedResources).toHaveBeenCalledWith('booking_1', {
      transferId: 42,
      vehicleId: 1,
      deviceId: 'GPS-001',
      driverId: 'auth0|driver',
      vehicleLabel: undefined,
      driverName: undefined,
      status: 'assigned',
      assignedAt: '2026-06-25T00:00:00.000Z',
    });
  });
});
