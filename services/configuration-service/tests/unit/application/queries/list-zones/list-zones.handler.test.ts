import { ListZonesHandler } from '../../../../../src/application/queries/list-zones/list-zones.handler';
import { ListZonesQuery } from '../../../../../src/application/queries/list-zones/list-zones.query';
import { ZoneType } from '../../../../../src/domain/enums/zone-type';
import type { IZoneReadRepository } from '../../../../../src/domain/repositories/zone.read.repository';

describe('ListZonesHandler', () => {
  let mockReadRepository: jest.Mocked<IZoneReadRepository>;
  let handler: ListZonesHandler;

  beforeEach(() => {
    mockReadRepository = { getAll: jest.fn() };
    handler = new ListZonesHandler(mockReadRepository);
  });

  it('should delegate to the read repository with the filter', async () => {
    const zones = [{ id: 1, name: 'Centro', type: ZoneType.RED_ZONE, coordinates: [] }];
    mockReadRepository.getAll.mockResolvedValueOnce(zones);

    const result = await handler.execute(new ListZonesQuery(ZoneType.RED_ZONE, 10, 0));

    expect(mockReadRepository.getAll).toHaveBeenCalledWith({
      type: ZoneType.RED_ZONE,
      limit: 10,
      skip: 0,
    });
    expect(result).toBe(zones);
  });
});
