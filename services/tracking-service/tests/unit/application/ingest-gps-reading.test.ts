jest.mock('@move/logs-lib', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { IngestGpsReadingCommand } from '../../../src/application/commands/ingest-gps-reading/ingest-gps-reading.command';
import { IngestGpsReadingHandler } from '../../../src/application/commands/ingest-gps-reading/ingest-gps-reading.handler';
import type { IGpsIngestPublisher } from '../../../src/application/contracts/gps-ingest.publisher';
import type { IRegisteredDeviceProvider } from '../../../src/application/contracts/registered-device.provider';

describe('IngestGpsReadingCommand.create', () => {
  const validBody = {
    transferId: 7,
    vehicleId: 1,
    deviceId: 'GPS-001',
    coordinates: [-56.16, -34.9],
    timestamp: '2026-06-23T10:00:00.000Z',
  };

  it('builds a command from a valid body', () => {
    const command = IngestGpsReadingCommand.create(validBody);
    expect(command.vehicleId).toBe(1);
    expect(command.coordinates).toEqual([-56.16, -34.9]);
  });

  it('defaults to an empty body when none is provided', () => {
    expect(() => IngestGpsReadingCommand.create(undefined)).toThrow(
      'transferId must be a positive integer'
    );
  });

  it('defaults the timestamp when missing', () => {
    const command = IngestGpsReadingCommand.create({ ...validBody, timestamp: undefined });
    expect(command.timestamp).toEqual(expect.any(String));
  });

  it('rejects invalid coordinates', () => {
    expect(() => IngestGpsReadingCommand.create({ ...validBody, coordinates: [200, 0] })).toThrow();
    expect(() => IngestGpsReadingCommand.create({ ...validBody, coordinates: [-56.16] })).toThrow();
  });

  it('rejects a missing deviceId', () => {
    expect(() => IngestGpsReadingCommand.create({ ...validBody, deviceId: '' })).toThrow();
  });

  it('rejects an invalid vehicleId', () => {
    expect(() => IngestGpsReadingCommand.create({ ...validBody, vehicleId: 'abc' })).toThrow(
      'vehicleId must be a positive integer'
    );
    expect(() => IngestGpsReadingCommand.create({ ...validBody, vehicleId: -1 })).toThrow();
  });

  it('rejects an invalid timestamp', () => {
    expect(() => IngestGpsReadingCommand.create({ ...validBody, timestamp: 'not-a-date' })).toThrow(
      'timestamp must be a valid date'
    );
  });

  it('rejects an invalid transferId', () => {
    expect(() => IngestGpsReadingCommand.create({ ...validBody, transferId: 'abc' })).toThrow();
    expect(() => IngestGpsReadingCommand.create({ ...validBody, transferId: -1 })).toThrow();
  });
});

describe('IngestGpsReadingHandler', () => {
  function setup(registered: boolean) {
    const deviceProvider: jest.Mocked<IRegisteredDeviceProvider> = {
      isRegistered: jest.fn().mockResolvedValue(registered),
    };
    const publisher: jest.Mocked<IGpsIngestPublisher> = { publish: jest.fn() };
    const handler = new IngestGpsReadingHandler(deviceProvider, publisher);
    return { handler, deviceProvider, publisher };
  }

  const command = new IngestGpsReadingCommand(
    7,
    1,
    'GPS-001',
    [-56.16, -34.9],
    '2026-06-23T10:00:00.000Z'
  );

  it('publishes the reading when the device is registered', async () => {
    const { handler, publisher } = setup(true);

    await handler.execute(command);

    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ transferId: 7, deviceId: 'GPS-001' })
    );
  });

  it('rejects (401) and does not publish when the device is not registered', async () => {
    const { handler, publisher } = setup(false);

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 401 });
    expect(publisher.publish).not.toHaveBeenCalled();
  });
});
