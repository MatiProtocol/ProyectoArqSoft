import { ErrorFactory } from '@move/errors-lib';
import { MongoServerError } from 'mongodb';
import type { UpdateVehicleDto } from '../../domain/dtos/vehicle-write.dto';
import type { Vehicle } from '../../domain/entities/vehicle';
import type { IVehicleWriteRepository } from '../../domain/repositories/vehicle.write.repository';
import { VehicleModel } from '../models/vehicle.model';

const MAX_ID_GENERATION_ATTEMPTS = 5;

function toUniqueConflict(error: MongoServerError): never {
  if (error.keyPattern?.deviceId) {
    throw ErrorFactory.conflict('A vehicle with this deviceId already exists.');
  }
  throw ErrorFactory.conflict('A vehicle with this license plate already exists.');
}

export class VehicleWriteRepository implements IVehicleWriteRepository {
  async create(vehicle: Vehicle): Promise<number> {
    for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt++) {
      const nextId = await this.nextId();
      const vehicleDocument = new VehicleModel({
        _id: nextId,
        licensePlate: vehicle.licensePlate,
        type: vehicle.type,
        capacity: vehicle.capacity,
        available: vehicle.available,
        deviceId: vehicle.deviceId,
        characteristics: vehicle.characteristics,
      });

      try {
        await vehicleDocument.save();
        return nextId;
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
          if (error.keyPattern?._id) {
            continue;
          }
          toUniqueConflict(error);
        }
        throw error;
      }
    }

    throw ErrorFactory.conflict('Could not assign a unique id for the new vehicle, please retry.');
  }

  async update(id: number, dto: UpdateVehicleDto): Promise<void> {
    const update: Record<string, unknown> = {};
    if (dto.licensePlate !== undefined) update.licensePlate = dto.licensePlate;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.capacity !== undefined) update.capacity = dto.capacity;
    if (dto.available !== undefined) update.available = dto.available;
    if (dto.deviceId !== undefined) update.deviceId = dto.deviceId;
    if (dto.characteristics !== undefined) update.characteristics = dto.characteristics;

    let result: { matchedCount: number };
    try {
      result = await VehicleModel.updateOne({ _id: id }, { $set: update });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        toUniqueConflict(error);
      }
      throw error;
    }

    if (result.matchedCount === 0) {
      throw ErrorFactory.notFound('Vehicle', id);
    }
  }

  async delete(id: number): Promise<void> {
    const result = await VehicleModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw ErrorFactory.notFound('Vehicle', id);
    }
  }

  private async nextId(): Promise<number> {
    const last = await VehicleModel.findOne().sort({ _id: -1 }).select('_id').lean();
    return (last?._id ?? 0) + 1;
  }
}
