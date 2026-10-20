import type { TransferReadDto } from '../dtos/transfer-read.dto';

export type ActiveTransferFilter = {
  vehicleId?: number;
  driverId?: string;
  category?: string;
  hasActiveAlerts?: boolean;
  limit?: number;
  skip?: number;
};

export interface ITransferReadRepository {
  findById(id: number): Promise<TransferReadDto | null>;
  getActive(filter: ActiveTransferFilter): Promise<TransferReadDto[]>;
  existsActiveForVehicle(vehicleId: number): Promise<boolean>;
}
