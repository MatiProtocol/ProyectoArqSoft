import { assertValidRing } from '../../../src/domain/geo/validate-ring';

const validRing = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

describe('assertValidRing', () => {
  it('should return the ring when it is valid and closed', () => {
    expect(assertValidRing(validRing)).toEqual(validRing);
  });

  it('should throw 400 when value is not an array or has fewer than 4 positions', () => {
    expect(() => assertValidRing('nope')).toThrow(expect.objectContaining({ status: 400 }));
    expect(() =>
      assertValidRing([
        [0, 0],
        [0, 1],
        [0, 0],
      ])
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 when a position is not a valid [lng, lat] pair', () => {
    expect(() =>
      assertValidRing([
        [0, 0],
        [0, 1],
        [1, 'x'],
        [1, 0],
        [0, 0],
      ])
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 when a position is out of lng/lat range', () => {
    expect(() =>
      assertValidRing([
        [0, 0],
        [0, 1],
        [200, 1],
        [1, 0],
        [0, 0],
      ])
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 when the ring is not closed', () => {
    expect(() =>
      assertValidRing([
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
      ])
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});
