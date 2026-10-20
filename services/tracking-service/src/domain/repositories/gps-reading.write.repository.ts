import type { GpsReading } from '../entities/gps-reading';

export interface IGpsReadingWriteRepository {
  create(reading: GpsReading): Promise<void>;
}
