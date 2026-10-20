import { RecordGpsReadingCommand } from '../../../src/application/commands/record-gps-reading/record-gps-reading.command';
import { RecordGpsReadingHandler } from '../../../src/application/commands/record-gps-reading/record-gps-reading.handler';
import type { IAlertDetectionPublisher } from '../../../src/application/contracts/alert-detection.publisher';
import type { IGpsReadingWriteRepository } from '../../../src/domain/repositories/gps-reading.write.repository';
import type { ITransferWriteRepository } from '../../../src/domain/repositories/transfer.write.repository';

function setup() {
  const gpsReadingWrite: jest.Mocked<IGpsReadingWriteRepository> = { create: jest.fn() };
  const transferWrite: jest.Mocked<ITransferWriteRepository> = {
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateLastPosition: jest.fn(),
    markHasActiveAlerts: jest.fn(),
  };
  const alertDetectionPublisher: jest.Mocked<IAlertDetectionPublisher> = { publish: jest.fn() };

  const handler = new RecordGpsReadingHandler(
    gpsReadingWrite,
    transferWrite,
    alertDetectionPublisher
  );
  return { handler, gpsReadingWrite, transferWrite, alertDetectionPublisher };
}

describe('RecordGpsReadingHandler', () => {
  const command = new RecordGpsReadingCommand(
    7,
    1,
    'GPS-001',
    [-56.16, -34.9],
    '2026-06-23T10:00:00.000Z'
  );

  it('persists the reading, updates the last position and publishes for detection', async () => {
    const { handler, gpsReadingWrite, transferWrite, alertDetectionPublisher } = setup();

    await handler.execute(command);

    expect(gpsReadingWrite.create).toHaveBeenCalledTimes(1);
    const createdReading = gpsReadingWrite.create.mock.calls[0][0];
    expect(createdReading.transferId).toBe(7);
    expect(createdReading.vehicleId).toBe(1);
    expect(createdReading.deviceId).toBe('GPS-001');
    expect(createdReading.coordinates).toEqual([-56.16, -34.9]);

    expect(transferWrite.updateLastPosition).toHaveBeenCalledWith(
      7,
      [-56.16, -34.9],
      '2026-06-23T10:00:00.000Z'
    );

    expect(alertDetectionPublisher.publish).toHaveBeenCalledWith({
      gpsReadingId: createdReading.id,
      transferId: 7,
      vehicleId: 1,
      deviceId: 'GPS-001',
      coordinates: [-56.16, -34.9],
      timestamp: '2026-06-23T10:00:00.000Z',
    });
  });

  it('propagates errors from the write repository', async () => {
    const { handler, gpsReadingWrite } = setup();
    gpsReadingWrite.create.mockRejectedValueOnce(new Error('db down'));

    await expect(handler.execute(command)).rejects.toThrow('db down');
  });
});
