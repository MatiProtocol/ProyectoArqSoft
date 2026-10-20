import { isValidCoordinates } from '../../../src/domain/value-objects/coordinates';

describe('isValidCoordinates', () => {
  it('accepts a valid [lng, lat] tuple', () => {
    expect(isValidCoordinates([-56.16, -34.9])).toBe(true);
  });

  it('rejects a non-array value', () => {
    expect(isValidCoordinates('not-an-array')).toBe(false);
  });

  it('rejects an array with the wrong length', () => {
    expect(isValidCoordinates([-56.16])).toBe(false);
  });

  it('rejects non-numeric values', () => {
    expect(isValidCoordinates(['-56.16', -34.9])).toBe(false);
  });

  it('rejects NaN values', () => {
    expect(isValidCoordinates([Number.NaN, -34.9])).toBe(false);
    expect(isValidCoordinates([-56.16, Number.NaN])).toBe(false);
  });

  it('rejects out-of-range longitude or latitude', () => {
    expect(isValidCoordinates([200, 0])).toBe(false);
    expect(isValidCoordinates([0, -100])).toBe(false);
  });
});
