import type { UpdateVehicleDto } from '../dtos/vehicle-write.dto';
import type { Vehicle } from '../entities/vehicle';

export interface IVehicleWriteRepository {
  create(vehicle: Vehicle): Promise<number>;
  update(id: number, dto: UpdateVehicleDto): Promise<void>;
  delete(id: number): Promise<void>;
}
