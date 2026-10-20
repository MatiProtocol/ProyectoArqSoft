import { Types } from 'mongoose';
import { GpsReading } from '../../../domain/entities/gps-reading';
import type { IGpsReadingWriteRepository } from '../../../domain/repositories/gps-reading.write.repository';
import type { ITransferWriteRepository } from '../../../domain/repositories/transfer.write.repository';
import type { IAlertDetectionPublisher } from '../../contracts/alert-detection.publisher';
import type { RecordGpsReadingCommand } from './record-gps-reading.command';

export class RecordGpsReadingHandler {
  constructor(
    private readonly gpsReadingWriteRepository: IGpsReadingWriteRepository,
    private readonly transferWriteRepository: ITransferWriteRepository,
    private readonly alertDetectionPublisher: IAlertDetectionPublisher
  ) {}

  async execute(command: RecordGpsReadingCommand): Promise<void> {
    const gpsReadingId = new Types.ObjectId().toString();

    const reading = new GpsReading(
      gpsReadingId,
      command.transferId,
      command.vehicleId,
      command.deviceId,
      command.coordinates,
      command.timestamp
    );

    await this.gpsReadingWriteRepository.create(reading);

    await this.transferWriteRepository.updateLastPosition(
      command.transferId,
      command.coordinates,
      command.timestamp
    );

    await this.alertDetectionPublisher.publish({
      gpsReadingId,
      transferId: command.transferId,
      vehicleId: command.vehicleId,
      deviceId: command.deviceId,
      coordinates: command.coordinates,
      timestamp: command.timestamp,
    });
  }
}
