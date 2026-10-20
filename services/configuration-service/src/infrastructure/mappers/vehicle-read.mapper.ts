import type { VehicleReadDto } from '../../domain/dtos/vehicle-read.dto';
import type { VehicleDocument } from '../models/vehicle.model';

export function toVehicleReadDto(vehicle: VehicleDocument): VehicleReadDto {
  return {
    id: vehicle._id,
    licensePlate: vehicle.licensePlate,
    type: vehicle.type,
    capacity: vehicle.capacity,
    available: vehicle.available,
    deviceId: vehicle.deviceId,
    characteristics: vehicle.characteristics,
  };
}
