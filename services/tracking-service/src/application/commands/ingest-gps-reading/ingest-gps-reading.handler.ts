import { ErrorFactory } from '@move/errors-lib';
import { logger } from '@move/logs-lib';
import type { IGpsIngestPublisher } from '../../contracts/gps-ingest.publisher';
import type { IRegisteredDeviceProvider } from '../../contracts/registered-device.provider';
import type { IngestGpsReadingCommand } from './ingest-gps-reading.command';

export class IngestGpsReadingHandler {
  constructor(
    private readonly registeredDeviceProvider: IRegisteredDeviceProvider,
    private readonly gpsIngestPublisher: IGpsIngestPublisher
  ) {}

  async execute(command: IngestGpsReadingCommand): Promise<void> {
    const isRegistered = await this.registeredDeviceProvider.isRegistered(command.deviceId);

    if (!isRegistered) {
      logger.warn('Rejected GPS reading from unregistered device', {
        deviceId: command.deviceId,
        vehicleId: command.vehicleId,
        transferId: command.transferId,
      });
      throw ErrorFactory.unauthorized('GPS device is not registered');
    }

    await this.gpsIngestPublisher.publish({
      transferId: command.transferId,
      vehicleId: command.vehicleId,
      deviceId: command.deviceId,
      coordinates: command.coordinates,
      timestamp: command.timestamp,
    });
  }
}
