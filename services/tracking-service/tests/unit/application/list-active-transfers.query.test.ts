import { ListActiveTransfersQuery } from '../../../src/application/queries/list-active-transfers/list-active-transfers.query';

describe('ListActiveTransfersQuery.fromQueryParams', () => {
  it('parses valid filters', () => {
    const query = ListActiveTransfersQuery.fromQueryParams({
      vehicleId: '12',
      driverId: 'auth0|driver',
      category: 'electronics',
      hasActiveAlerts: 'true',
      limit: '10',
      skip: '5',
    });

    expect(query.vehicleId).toBe(12);
    expect(query.driverId).toBe('auth0|driver');
    expect(query.hasActiveAlerts).toBe(true);
    expect(query.limit).toBe(10);
    expect(query.skip).toBe(5);
  });

  it('returns undefined filters when omitted', () => {
    const query = ListActiveTransfersQuery.fromQueryParams({});
    expect(query.vehicleId).toBeUndefined();
    expect(query.hasActiveAlerts).toBeUndefined();
  });

  it('rejects an invalid vehicleId', () => {
    expect(() => ListActiveTransfersQuery.fromQueryParams({ vehicleId: 'abc' })).toThrow();
  });

  it('parses hasActiveAlerts: false', () => {
    const query = ListActiveTransfersQuery.fromQueryParams({ hasActiveAlerts: 'false' });
    expect(query.hasActiveAlerts).toBe(false);
  });

  it('rejects an invalid hasActiveAlerts', () => {
    expect(() => ListActiveTransfersQuery.fromQueryParams({ hasActiveAlerts: 'maybe' })).toThrow();
  });

  it('rejects an empty driverId', () => {
    expect(() => ListActiveTransfersQuery.fromQueryParams({ driverId: '   ' })).toThrow(
      'driverId must be a non-empty string'
    );
  });

  it('rejects a non-string category', () => {
    expect(() =>
      ListActiveTransfersQuery.fromQueryParams({ category: 123 as unknown as string })
    ).toThrow('category must be a non-empty string');
  });

  it('rejects a non-numeric limit', () => {
    expect(() => ListActiveTransfersQuery.fromQueryParams({ limit: 'abc' })).toThrow(
      'limit must be a non-negative integer'
    );
  });

  it('rejects a non-numeric skip', () => {
    expect(() => ListActiveTransfersQuery.fromQueryParams({ skip: 'abc' })).toThrow(
      'skip must be a non-negative integer'
    );
  });
});
