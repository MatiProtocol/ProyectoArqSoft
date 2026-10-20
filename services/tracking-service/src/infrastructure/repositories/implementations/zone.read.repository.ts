import type {
  IZoneReadRepository,
  RedZoneMatch,
} from '../../../application/contracts/zone.read.repository';
import type { Coordinates } from '../../../domain/value-objects/coordinates';
import { ZoneModel } from '../../models/zone.model';

const RED_ZONE = 'RED_ZONE';

export class ZoneReadRepository implements IZoneReadRepository {
  async findRedZonesContaining(coordinates: Coordinates): Promise<RedZoneMatch[]> {
    const zones = await ZoneModel.find({
      type: RED_ZONE,
      polygon: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates },
        },
      },
    })
      .select('_id name')
      .lean();

    return zones.map((zone) => ({ id: zone._id, name: zone.name }));
  }
}
