jest.mock('@move/logs-lib', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { DetectSituationsCommand } from '../../../src/application/commands/detect-situations/detect-situations.command';
import {
  DetectSituationsHandler,
  type ProlongedStopThresholds,
} from '../../../src/application/commands/detect-situations/detect-situations.handler';
import type { IAlertNotificationPublisher } from '../../../src/application/contracts/alert-notification.publisher';
import type { IGpsReadingReadRepository } from '../../../src/application/contracts/gps-reading.read.repository';
import type { IZoneReadRepository } from '../../../src/application/contracts/zone.read.repository';
import type { PositionReadDto } from '../../../src/application/dtos/position-read.dto';
import { AlertType } from '../../../src/domain/enums/alert-type';
import type { IAlertWriteRepository } from '../../../src/domain/repositories/alert.write.repository';
import type { ITransferWriteRepository } from '../../../src/domain/repositories/transfer.write.repository';
import type { Coordinates } from '../../../src/domain/value-objects/coordinates';

const COORDS: Coordinates = [-56.16, -34.9];
const THRESHOLDS: ProlongedStopThresholds = { radiusMeters: 30, windowMs: 120000, minReadings: 5 };

function setup() {
  const zoneRead: jest.Mocked<IZoneReadRepository> = { findRedZonesContaining: jest.fn() };
  const gpsRead: jest.Mocked<IGpsReadingReadRepository> = { getRecentByTransfer: jest.fn() };
  const alertWrite: jest.Mocked<IAlertWriteRepository> = { create: jest.fn() };
  const transferWrite: jest.Mocked<ITransferWriteRepository> = {
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateLastPosition: jest.fn(),
    markHasActiveAlerts: jest.fn(),
  };
  const notifier: jest.Mocked<IAlertNotificationPublisher> = { publish: jest.fn() };

  zoneRead.findRedZonesContaining.mockResolvedValue([]);
  gpsRead.getRecentByTransfer.mockResolvedValue([]);

  const handler = new DetectSituationsHandler(
    zoneRead,
    gpsRead,
    alertWrite,
    transferWrite,
    notifier,
    THRESHOLDS
  );
  return { handler, zoneRead, gpsRead, alertWrite, transferWrite, notifier };
}

function stoppedReadings(): PositionReadDto[] {
  const base = Date.parse('2026-06-23T10:00:00.000Z');
  return Array.from({ length: 5 }, (_, i) => ({
    coordinates: COORDS,
    timestamp: new Date(base + i * 35000).toISOString(),
  }));
}

const command = new DetectSituationsCommand(
  '507f1f77bcf86cd799439011',
  42,
  1,
  'GPS-001',
  COORDS,
  '2026-06-23T10:02:20.000Z'
);

describe('DetectSituationsHandler', () => {
  it('raises a critical alert and notifies when inside a red zone', async () => {
    const { handler, zoneRead, alertWrite, transferWrite, notifier } = setup();
    zoneRead.findRedZonesContaining.mockResolvedValue([{ id: 7, name: 'Centro' }]);

    await handler.execute(command);

    expect(alertWrite.create).toHaveBeenCalledTimes(1);
    expect(alertWrite.create.mock.calls[0][0].type).toBe(AlertType.RED_ZONE_ENTRY);
    expect(notifier.publish).toHaveBeenCalledTimes(1);
    expect(transferWrite.markHasActiveAlerts).toHaveBeenCalledWith(command.transferId, true);
  });

  it('raises a prolonged-stop alert when the vehicle has not moved in the window', async () => {
    const { handler, gpsRead, alertWrite, notifier } = setup();
    gpsRead.getRecentByTransfer.mockResolvedValue(stoppedReadings());

    await handler.execute(command);

    expect(alertWrite.create).toHaveBeenCalledTimes(1);
    expect(alertWrite.create.mock.calls[0][0].type).toBe(AlertType.PROLONGED_STOP);
    expect(notifier.publish).toHaveBeenCalledTimes(1);
  });

  it('does not raise a prolonged-stop alert when readings are spread beyond the radius', async () => {
    const { handler, gpsRead, alertWrite, notifier } = setup();
    const base = Date.parse('2026-06-23T10:00:00.000Z');
    gpsRead.getRecentByTransfer.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        coordinates: [-56.16 - i * 0.01, -34.9] as Coordinates,
        timestamp: new Date(base + i * 35000).toISOString(),
      }))
    );

    await handler.execute(command);

    expect(alertWrite.create).not.toHaveBeenCalled();
    expect(notifier.publish).not.toHaveBeenCalled();
  });

  it('does not raise a prolonged-stop alert when the stop window is too short', async () => {
    const { handler, gpsRead, alertWrite, notifier } = setup();
    const base = Date.parse('2026-06-23T10:00:00.000Z');
    gpsRead.getRecentByTransfer.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        coordinates: COORDS,
        timestamp: new Date(base + i * 1000).toISOString(),
      }))
    );

    await handler.execute(command);

    expect(alertWrite.create).not.toHaveBeenCalled();
    expect(notifier.publish).not.toHaveBeenCalled();
  });

  it('does nothing when there is no red zone and the vehicle is moving', async () => {
    const { handler, gpsRead, alertWrite, transferWrite, notifier } = setup();
    gpsRead.getRecentByTransfer.mockResolvedValue([
      { coordinates: COORDS, timestamp: '2026-06-23T10:00:00.000Z' },
      { coordinates: [-56.2, -34.95], timestamp: '2026-06-23T10:02:00.000Z' },
    ]);

    await handler.execute(command);

    expect(alertWrite.create).not.toHaveBeenCalled();
    expect(notifier.publish).not.toHaveBeenCalled();
    expect(transferWrite.markHasActiveAlerts).not.toHaveBeenCalled();
  });
});
