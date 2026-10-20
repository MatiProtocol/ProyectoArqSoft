import { parseNumericId } from '../../../src/domain/validate-numeric-id';

describe('parseNumericId', () => {
  it('should return the parsed number for a valid numeric id', () => {
    expect(parseNumericId('42', 'Zone')).toBe(42);
  });

  it('should throw 400 for a non-numeric id', () => {
    expect(() => parseNumericId('abc', 'Zone')).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => parseNumericId('1.5', 'Vehicle')).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
