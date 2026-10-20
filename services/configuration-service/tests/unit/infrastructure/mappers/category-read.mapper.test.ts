import { toCategoryReadDto } from '../../../../src/infrastructure/mappers/category-read.mapper';

describe('toCategoryReadDto', () => {
  it('should map a category document to its read DTO with a numeric id and rules', () => {
    const doc = {
      _id: 7,
      nameEn: 'Furniture',
      nameEs: 'Muebles',
      description: 'Home items',
      rules: [
        { id: 2, type: 'ALERTS' },
        { id: 3, type: 'SURCHARGE' },
      ],
    };

    expect(toCategoryReadDto(doc as any)).toEqual({
      id: 7,
      nameEn: 'Furniture',
      nameEs: 'Muebles',
      description: 'Home items',
      rules: [
        { id: 2, type: 'ALERTS' },
        { id: 3, type: 'SURCHARGE' },
      ],
    });
  });

  it('should default rules to an empty array when the document has none', () => {
    const doc = {
      _id: 7,
      nameEn: 'Furniture',
      nameEs: 'Muebles',
      description: 'Home items',
    };

    expect(toCategoryReadDto(doc)).toEqual({
      id: 7,
      nameEn: 'Furniture',
      nameEs: 'Muebles',
      description: 'Home items',
      rules: [],
    });
  });
});
