import { ZoneType } from '../../../../src/domain/enums/zone-type';
import { toZoneReadDto } from '../../../../src/infrastructure/mappers/zone-read.mapper';
import type { ZoneDocument } from '../../../../src/infrastructure/models/zone.model';

describe('toZoneReadDto', () => {
  it('should map a zone document to its read DTO with flattened coordinates', () => {
    const ring = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ];
    const doc = {
      _id: 7,
      name: 'Centro',
      type: ZoneType.RED_ZONE,
      polygon: { type: 'Polygon', coordinates: [ring] },
    } as unknown as ZoneDocument;

    expect(toZoneReadDto(doc)).toEqual({
      id: 7,
      name: 'Centro',
      type: ZoneType.RED_ZONE,
      coordinates: ring,
    });
  });
});
