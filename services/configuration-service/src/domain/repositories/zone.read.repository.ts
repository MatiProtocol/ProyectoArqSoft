import type { ZoneReadDto } from '../dtos/zone-read.dto';
import type { ZoneType } from '../enums/zone-type';

export type ZoneFilter = {
  type?: ZoneType;
  limit?: number;
  skip?: number;
};

export interface IZoneReadRepository {
  getAll(filter: ZoneFilter): Promise<ZoneReadDto[]>;
}
