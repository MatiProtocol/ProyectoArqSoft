import type { ZoneReadDto } from '../../domain/dtos/zone-read.dto';
import type { ZoneDocument } from '../models/zone.model';

export function toZoneReadDto(zone: ZoneDocument): ZoneReadDto {
  return {
    id: zone._id,
    name: zone.name,
    type: zone.type,
    coordinates: zone.polygon.coordinates[0],
  };
}
