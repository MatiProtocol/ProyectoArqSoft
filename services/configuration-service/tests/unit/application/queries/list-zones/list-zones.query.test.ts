import { ListZonesQuery } from '../../../../../src/application/queries/list-zones/list-zones.query';
import { ZoneType } from '../../../../../src/domain/enums/zone-type';

describe('ListZonesQuery.fromQueryParams', () => {
  it('should build an empty query when no params are given', () => {
    const query = ListZonesQuery.fromQueryParams({});
    expect(query.type).toBeUndefined();
    expect(query.limit).toBeUndefined();
    expect(query.skip).toBeUndefined();
  });

  it('should parse a valid type and pagination', () => {
    const query = ListZonesQuery.fromQueryParams({ type: 'RED_ZONE', limit: '10', skip: '5' });
    expect(query.type).toBe(ZoneType.RED_ZONE);
    expect(query.limit).toBe(10);
    expect(query.skip).toBe(5);
  });

  it('should throw 400 for an invalid type', () => {
    expect(() => ListZonesQuery.fromQueryParams({ type: 'NOPE' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 for a non-integer limit', () => {
    expect(() => ListZonesQuery.fromQueryParams({ limit: 'x' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
