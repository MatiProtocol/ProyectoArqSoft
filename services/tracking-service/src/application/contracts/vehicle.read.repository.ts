export type VehicleInfo = {
  id: number;
  licensePlate: string;
  capacity: number;
  available: boolean;
  deviceId?: string;
};

export interface IVehicleReadRepository {
  findById(id: number): Promise<VehicleInfo | null>;
}
