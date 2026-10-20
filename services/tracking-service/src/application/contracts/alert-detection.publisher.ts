import type { GpsReadingJob } from './gps-ingest.publisher';

export type AlertDetectionJob = GpsReadingJob & {
  gpsReadingId: string;
};

export interface IAlertDetectionPublisher {
  publish(job: AlertDetectionJob): Promise<void>;
}
