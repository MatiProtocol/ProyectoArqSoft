import type { IGpsReadingReadRepository } from '../../../application/contracts/gps-reading.read.repository';
import type { PositionReadDto } from '../../../application/dtos/position-read.dto';
import type { Coordinates } from '../../../domain/value-objects/coordinates';
import { GpsReadingModel } from '../../models/gps-reading.model';

export class GpsReadingReadRepository implements IGpsReadingReadRepository {
  async getRecentByTransfer(transferId: number, limit: number): Promise<PositionReadDto[]> {
    const readings = await GpsReadingModel.find({ transferId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return readings.map((reading) => ({
      coordinates: reading.location.coordinates as Coordinates,
      timestamp: reading.timestamp.toISOString(),
    }));
  }
}
