import type { VehicleType } from '../enums/vehicle-type';

export type UpdateVehicleDto = {
  licensePlate?: string;
  type?: VehicleType;
  capacity?: number;
  available?: boolean;
  deviceId?: string;
  characteristics?: Record<string, unknown>;
};
