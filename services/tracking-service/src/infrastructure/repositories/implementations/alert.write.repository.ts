import { ErrorFactory } from '@move/errors-lib';
import type { Alert } from '../../../domain/entities/alert';
import type { IAlertWriteRepository } from '../../../domain/repositories/alert.write.repository';
import { AlertModel } from '../../models/alert.model';

export class AlertWriteRepository implements IAlertWriteRepository {
  async create(alert: Alert): Promise<void> {
    const alertDocument = new AlertModel({
      _id: alert.id,
      transferId: alert.transferId,
      vehicleId: alert.vehicleId,
      type: alert.type,
      severity: alert.severity,
      description: alert.description,
      gpsReadingId: alert.gpsReadingId,
      zoneId: alert.zoneId,
      occurredAt: new Date(alert.occurredAt),
    });

    try {
      await alertDocument.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw ErrorFactory.conflict('Alert already exists.');
      }
      throw error;
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorWithCode = error as Error & { code?: unknown };

  return errorWithCode.code === 11000;
}
