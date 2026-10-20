import mongoose, { type SchemaDefinition } from 'mongoose';
import { CategorySource } from '../../../../src/domain/enums/category-source';

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  let capturedDefinition: SchemaDefinition | null = null;
  const capturedIndexes: Array<{ fields: Record<string, number>; options?: object }> = [];
  const mockSchema = jest.fn((definition: SchemaDefinition) => {
    capturedDefinition = definition;
    const schema = new actual.Schema(definition);
    const originalIndex = schema.index.bind(schema);
    schema.index = (fields: Record<string, number>, options?: object) => {
      capturedIndexes.push({ fields, options });
      return originalIndex(fields, options);
    };
    return schema;
  });
  return {
    ...actual,
    Schema: mockSchema,
    model: jest.fn().mockImplementation((name, schema) => ({ name, schema })),
    __capturedDefinition: () => capturedDefinition,
    __capturedIndexes: () => capturedIndexes,
  };
});

import { CategoryModel } from '../../../../src/infrastructure/models/category.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
  __capturedIndexes: () => Array<{
    fields: Record<string, number>;
    options?: { unique?: boolean };
  }>;
};

describe('CategoryModel (mongoose model)', () => {
  let schemaDefinition: mongoose.SchemaDefinition | null;

  beforeAll(() => {
    schemaDefinition = mockedMongoose.__capturedDefinition();
  });

  it('should define the model with name "Category"', () => {
    expect(CategoryModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Category', expect.anything());
  });

  it('should use a numeric _id and not an externalId field', () => {
    const idDef = schemaDefinition?._id as { type: NumberConstructor };
    expect(idDef.type).toBe(Number);
    expect(schemaDefinition).not.toHaveProperty('externalId');
  });

  it('should have the expected catalog fields', () => {
    expect(schemaDefinition).toHaveProperty('nameEn');
    expect(schemaDefinition).toHaveProperty('nameEs');
    expect(schemaDefinition).toHaveProperty('description');
    expect(schemaDefinition).toHaveProperty('source');
    expect(schemaDefinition).toHaveProperty('active');
  });

  it('should mark nameEn and nameEs as required', () => {
    expect(schemaDefinition?.nameEn).toHaveProperty('required', true);
    expect(schemaDefinition?.nameEs).toHaveProperty('required', true);
  });

  it('should configure source with enum and ADMIN default', () => {
    const sourceDef = schemaDefinition?.source as { enum?: string[]; default?: CategorySource };
    expect(sourceDef.enum).toEqual(Object.values(CategorySource));
    expect(sourceDef.default).toBe(CategorySource.ADMIN);
  });

  it('should default active to true', () => {
    const activeDef = schemaDefinition?.active as { default?: boolean };
    expect(activeDef.default).toBe(true);
  });

  it('should define rules as an array of schemas defaulting to empty', () => {
    const rulesDef = schemaDefinition?.rules as { type: any[]; default?: unknown[] };
    expect(rulesDef.type[0].constructor.name).toBe('Schema');
    expect(rulesDef.default).toEqual([]);
  });

  it('should declare a unique compound index on (nameEn, nameEs)', () => {
    const indexes = mockedMongoose.__capturedIndexes();
    const nameIndex = indexes.find((i) => i.fields.nameEn === 1 && i.fields.nameEs === 1);
    expect(nameIndex).toBeDefined();
    expect(nameIndex?.options?.unique).toBe(true);
  });
});
