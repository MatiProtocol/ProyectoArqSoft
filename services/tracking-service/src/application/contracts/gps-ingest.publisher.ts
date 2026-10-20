import type { Coordinates } from '../../domain/value-objects/coordinates';

export type GpsReadingJob = {
  transferId: number;
  vehicleId: number;
  deviceId: string;
  coordinates: Coordinates;
  timestamp: string;
};

export interface IGpsIngestPublisher {
  publish(job: GpsReadingJob): Promise<void>;
}
