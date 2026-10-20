import { ErrorFactory } from '@move/errors-lib';
import { MongoServerError } from 'mongodb';
import type { UpdateZoneDto } from '../../domain/dtos/zone-write.dto';
import type { Zone } from '../../domain/entities/zone';
import type { IZoneWriteRepository } from '../../domain/repositories/zone.write.repository';
import { ZoneModel } from '../models/zone.model';

const MAX_ID_GENERATION_ATTEMPTS = 5;

function toPolygon(coordinates: [number, number][]) {
  return { type: 'Polygon' as const, coordinates: [coordinates] };
}

export class ZoneWriteRepository implements IZoneWriteRepository {
  async create(zone: Zone): Promise<number> {
    for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt++) {
      const nextId = await this.nextId();
      const zoneDocument = new ZoneModel({
        _id: nextId,
        name: zone.name,
        type: zone.type,
        polygon: toPolygon(zone.coordinates),
      });

      try {
        await zoneDocument.save();
        return nextId;
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
          if (error.keyPattern?._id) {
            continue;
          }
          throw ErrorFactory.conflict('A zone with this name already exists.');
        }
        throw error;
      }
    }

    throw ErrorFactory.conflict('Could not assign a unique id for the new zone, please retry.');
  }

  async update(id: number, dto: UpdateZoneDto): Promise<void> {
    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.coordinates !== undefined) update.polygon = toPolygon(dto.coordinates);

    let result: { matchedCount: number };
    try {
      result = await ZoneModel.updateOne({ _id: id }, { $set: update });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw ErrorFactory.conflict('A zone with this name already exists.');
      }
      throw error;
    }

    if (result.matchedCount === 0) {
      throw ErrorFactory.notFound('Zone', id);
    }
  }

  async delete(id: number): Promise<void> {
    const result = await ZoneModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw ErrorFactory.notFound('Zone', id);
    }
  }

  private async nextId(): Promise<number> {
    const last = await ZoneModel.findOne().sort({ _id: -1 }).select('_id').lean();
    return (last?._id ?? 0) + 1;
  }
}
