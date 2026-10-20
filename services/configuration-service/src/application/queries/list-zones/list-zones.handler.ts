import type { ZoneReadDto } from '../../../domain/dtos/zone-read.dto';
import type { IZoneReadRepository } from '../../../domain/repositories/zone.read.repository';
import type { ListZonesQuery } from './list-zones.query';

export class ListZonesHandler {
  constructor(private readonly readRepository: IZoneReadRepository) {}

  async execute(query: ListZonesQuery): Promise<ZoneReadDto[]> {
    return this.readRepository.getAll({
      type: query.type,
      limit: query.limit,
      skip: query.skip,
    });
  }
}
