import type { ZoneReadDto } from '../../domain/dtos/zone-read.dto';
import type {
  IZoneReadRepository,
  ZoneFilter,
} from '../../domain/repositories/zone.read.repository';
import { toZoneReadDto } from '../mappers/zone-read.mapper';
import { ZoneModel } from '../models/zone.model';

type ZoneQuery = {
  type?: ZoneFilter['type'];
};

const DEFAULT_LIMIT = 50;

export class ZoneReadRepository implements IZoneReadRepository {
  async getAll(filter: ZoneFilter): Promise<ZoneReadDto[]> {
    const query: ZoneQuery = {};
    if (filter.type) query.type = filter.type;

    const limit = filter.limit ?? DEFAULT_LIMIT;
    const skip = filter.skip ?? 0;

    const zoneDocuments = await ZoneModel.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return zoneDocuments.map((zone) => toZoneReadDto(zone));
  }
}
