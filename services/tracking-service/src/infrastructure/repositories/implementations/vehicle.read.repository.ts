import type {
  IVehicleReadRepository,
  VehicleInfo,
} from '../../../application/contracts/vehicle.read.repository';
import { VehicleModel } from '../../models/vehicle.model';

export class VehicleReadRepository implements IVehicleReadRepository {
  async findById(id: number): Promise<VehicleInfo | null> {
    const vehicle = await VehicleModel.findById(id).lean();
    if (!vehicle) return null;

    return {
      id: vehicle._id,
      licensePlate: vehicle.licensePlate,
      capacity: vehicle.capacity,
      available: vehicle.available,
      deviceId: vehicle.deviceId,
    };
  }
}
