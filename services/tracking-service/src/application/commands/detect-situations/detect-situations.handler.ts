import { logger } from '@move/logs-lib';
import { Types } from 'mongoose';
import { Alert } from '../../../domain/entities/alert';
import { AlertSeverity } from '../../../domain/enums/alert-severity';
import { AlertType } from '../../../domain/enums/alert-type';
import { haversineDistanceMeters } from '../../../domain/geo/haversine-distance';
import type { IAlertWriteRepository } from '../../../domain/repositories/alert.write.repository';
import type { ITransferWriteRepository } from '../../../domain/repositories/transfer.write.repository';
import type { Coordinates } from '../../../domain/value-objects/coordinates';
import type { IAlertNotificationPublisher } from '../../contracts/alert-notification.publisher';
import type { IGpsReadingReadRepository } from '../../contracts/gps-reading.read.repository';
import type { IZoneReadRepository } from '../../contracts/zone.read.repository';
import type { DetectSituationsCommand } from './detect-situations.command';

export type ProlongedStopThresholds = {
  radiusMeters: number;
  windowMs: number;
  minReadings: number;
};

type DetectedSituation = {
  type: AlertType;
  severity: AlertSeverity;
  description: string;
  zoneId?: number;
};

export class DetectSituationsHandler {
  constructor(
    private readonly zoneReadRepository: IZoneReadRepository,
    private readonly gpsReadingReadRepository: IGpsReadingReadRepository,
    private readonly alertWriteRepository: IAlertWriteRepository,
    private readonly transferWriteRepository: ITransferWriteRepository,
    private readonly alertNotificationPublisher: IAlertNotificationPublisher,
    private readonly thresholds: ProlongedStopThresholds
  ) {}

  async execute(command: DetectSituationsCommand): Promise<void> {
    const situations: DetectedSituation[] = [];

    situations.push(...(await this.detectRedZones(command.coordinates)));

    const prolongedStop = await this.detectProlongedStop(command.transferId, command.coordinates);
    if (prolongedStop) {
      situations.push(prolongedStop);
    }

    if (situations.length === 0) {
      return;
    }

    for (const situation of situations) {
      await this.raiseAlert(command, situation);
    }

    await this.transferWriteRepository.markHasActiveAlerts(command.transferId, true);
  }

  private async detectRedZones(coordinates: Coordinates): Promise<DetectedSituation[]> {
    const redZones = await this.zoneReadRepository.findRedZonesContaining(coordinates);

    return redZones.map((zone) => ({
      type: AlertType.RED_ZONE_ENTRY,
      severity: AlertSeverity.CRITICAL,
      description: `Vehicle entered red zone '${zone.name}'`,
      zoneId: zone.id,
    }));
  }

  private async detectProlongedStop(
    transferId: number,
    coordinates: Coordinates
  ): Promise<DetectedSituation | null> {
    const recent = await this.gpsReadingReadRepository.getRecentByTransfer(
      transferId,
      this.thresholds.minReadings
    );

    if (recent.length < this.thresholds.minReadings) {
      return null;
    }

    const allWithinRadius = recent.every(
      (reading) =>
        haversineDistanceMeters(reading.coordinates, coordinates) <= this.thresholds.radiusMeters
    );
    if (!allWithinRadius) {
      return null;
    }

    const timestamps = recent.map((reading) => new Date(reading.timestamp).getTime());
    const span = Math.max(...timestamps) - Math.min(...timestamps);
    if (span < this.thresholds.windowMs) {
      return null;
    }

    const seconds = Math.round(span / 1000);
    return {
      type: AlertType.PROLONGED_STOP,
      severity: AlertSeverity.INFO,
      description: `Vehicle stopped for ${seconds}s within ${this.thresholds.radiusMeters}m`,
    };
  }

  private async raiseAlert(
    command: DetectSituationsCommand,
    situation: DetectedSituation
  ): Promise<void> {
    const alertId = new Types.ObjectId().toString();

    const alert = new Alert(
      alertId,
      command.transferId,
      command.vehicleId,
      situation.type,
      situation.severity,
      situation.description,
      command.gpsReadingId,
      situation.zoneId,
      command.timestamp
    );

    await this.alertWriteRepository.create(alert);

    await this.alertNotificationPublisher.publish({
      alertId,
      transferId: command.transferId,
      vehicleId: command.vehicleId,
      type: situation.type,
      severity: situation.severity,
      description: situation.description,
      occurredAt: command.timestamp,
    });

    logger.info('Alert raised', {
      alertId,
      transferId: command.transferId,
      vehicleId: command.vehicleId,
      type: situation.type,
      severity: situation.severity,
    });
  }
}
