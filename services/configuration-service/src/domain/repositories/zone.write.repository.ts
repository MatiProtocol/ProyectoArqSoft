import type { UpdateZoneDto } from '../dtos/zone-write.dto';
import type { Zone } from '../entities/zone';

export interface IZoneWriteRepository {
  create(zone: Zone): Promise<number>;
  update(id: number, dto: UpdateZoneDto): Promise<void>;
  delete(id: number): Promise<void>;
}
