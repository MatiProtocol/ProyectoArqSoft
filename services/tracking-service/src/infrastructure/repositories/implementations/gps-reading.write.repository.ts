import type { GpsReading } from '../../../domain/entities/gps-reading';
import type { IGpsReadingWriteRepository } from '../../../domain/repositories/gps-reading.write.repository';
import { GpsReadingModel } from '../../models/gps-reading.model';

export class GpsReadingWriteRepository implements IGpsReadingWriteRepository {
  async create(reading: GpsReading): Promise<void> {
    const gpsReadingDocument = new GpsReadingModel({
      _id: reading.id,
      transferId: reading.transferId,
      vehicleId: reading.vehicleId,
      deviceId: reading.deviceId,
      location: { type: 'Point', coordinates: reading.coordinates },
      timestamp: new Date(reading.timestamp),
    });

    await gpsReadingDocument.save();
  }
}
