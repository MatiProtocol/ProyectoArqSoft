import type { Alert } from '../entities/alert';

export interface IAlertWriteRepository {
  create(alert: Alert): Promise<void>;
}
