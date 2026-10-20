import type { VehicleReadDto } from '../dtos/vehicle-read.dto';
import type { VehicleType } from '../enums/vehicle-type';

export type VehicleFilter = {
  available?: boolean;
  type?: VehicleType;
  deviceId?: string;
  limit?: number;
  skip?: number;
};

export interface IVehicleReadRepository {
  getAll(filter: VehicleFilter): Promise<VehicleReadDto[]>;
}
