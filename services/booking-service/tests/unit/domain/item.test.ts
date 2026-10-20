import { Item } from '../../../src/domain/entities/item';
import { ItemSize } from '../../../src/domain/enums/item-size';

describe('Item entity', () => {
  const mockId = 'itm_123';
  const mockDescription = 'Mesa de madera';
  const mockCategory = 'furniture';

  it('should create an item with only required fields', () => {
    const item = new Item(mockId, mockDescription, mockCategory);

    expect(item.id).toBe(mockId);
    expect(item.description).toBe(mockDescription);
    expect(item.category).toBe(mockCategory);
    expect(item.value).toBeUndefined();
    expect(item.size).toBeUndefined();
  });

  it('should create an item with all fields', () => {
    const expectedValue = '1500';
    const expectedSize = ItemSize.SMALL;
    const item = new Item(mockId, mockDescription, mockCategory, expectedValue, expectedSize);

    expect(item.id).toBe(mockId);
    expect(item.description).toBe(mockDescription);
    expect(item.category).toBe(mockCategory);
    expect(item.value).toBe(expectedValue);
    expect(item.size).toEqual(expectedSize);
  });
});
