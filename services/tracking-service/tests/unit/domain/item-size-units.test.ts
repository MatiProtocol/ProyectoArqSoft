import { itemSizeToUnits, totalCapacityUnits } from '../../../src/domain/capacity/item-size-units';

describe('item-size-units', () => {
  it('maps known sizes to units', () => {
    expect(itemSizeToUnits('small')).toBe(1);
    expect(itemSizeToUnits('medium')).toBe(2);
    expect(itemSizeToUnits('large')).toBe(3);
  });

  it('is case-insensitive and defaults unknown/undefined to 1', () => {
    expect(itemSizeToUnits('LARGE')).toBe(3);
    expect(itemSizeToUnits('unknown')).toBe(1);
    expect(itemSizeToUnits(undefined)).toBe(1);
  });

  it('sums capacity units across items', () => {
    expect(totalCapacityUnits(['small', 'large', undefined])).toBe(5);
    expect(totalCapacityUnits([])).toBe(0);
  });
});
