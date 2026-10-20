import type { VehicleReadDto } from '../../domain/dtos/vehicle-read.dto';
import type {
  IVehicleReadRepository,
  VehicleFilter,
} from '../../domain/repositories/vehicle.read.repository';
import { toVehicleReadDto } from '../mappers/vehicle-read.mapper';
import { VehicleModel } from '../models/vehicle.model';

type VehicleQuery = {
  available?: boolean;
  type?: VehicleFilter['type'];
  deviceId?: string;
};

const DEFAULT_LIMIT = 50;

export class VehicleReadRepository implements IVehicleReadRepository {
  async getAll(filter: VehicleFilter): Promise<VehicleReadDto[]> {
    const query: VehicleQuery = {};
    if (filter.available !== undefined) query.available = filter.available;
    if (filter.type) query.type = filter.type;
    if (filter.deviceId) query.deviceId = filter.deviceId;

    const limit = filter.limit ?? DEFAULT_LIMIT;
    const skip = filter.skip ?? 0;

    const vehicleDocuments = await VehicleModel.find(query)
      .sort({ licensePlate: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return vehicleDocuments.map((vehicle) => toVehicleReadDto(vehicle));
  }
}
