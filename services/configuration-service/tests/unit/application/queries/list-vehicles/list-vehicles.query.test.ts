import { ListVehiclesQuery } from '../../../../../src/application/queries/list-vehicles/list-vehicles.query';
import { VehicleType } from '../../../../../src/domain/enums/vehicle-type';

describe('ListVehiclesQuery.fromQueryParams', () => {
  it('should build an empty query when no params are given', () => {
    const query = ListVehiclesQuery.fromQueryParams({});
    expect(query.available).toBeUndefined();
    expect(query.type).toBeUndefined();
    expect(query.deviceId).toBeUndefined();
  });

  it('should parse all valid params', () => {
    const query = ListVehiclesQuery.fromQueryParams({
      available: 'true',
      type: 'VAN',
      deviceId: 'dev-1',
      limit: '10',
      skip: '5',
    });
    expect(query.available).toBe(true);
    expect(query.type).toBe(VehicleType.VAN);
    expect(query.deviceId).toBe('dev-1');
    expect(query.limit).toBe(10);
    expect(query.skip).toBe(5);
  });

  it('should parse available=false', () => {
    expect(ListVehiclesQuery.fromQueryParams({ available: 'false' }).available).toBe(false);
  });

  it('should throw 400 for an invalid available value', () => {
    expect(() => ListVehiclesQuery.fromQueryParams({ available: 'maybe' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 for an invalid type', () => {
    expect(() => ListVehiclesQuery.fromQueryParams({ type: 'PLANE' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 for an empty deviceId', () => {
    expect(() => ListVehiclesQuery.fromQueryParams({ deviceId: '  ' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 for a non-integer skip', () => {
    expect(() => ListVehiclesQuery.fromQueryParams({ skip: 'x' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
