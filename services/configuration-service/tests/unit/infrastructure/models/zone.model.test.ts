import mongoose, { type SchemaDefinition } from 'mongoose';
import { ZoneType } from '../../../../src/domain/enums/zone-type';

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  let capturedDefinition: SchemaDefinition | null = null;
  const capturedIndexes: Array<{ fields: Record<string, unknown>; options?: object }> = [];
  const mockSchema = jest.fn((definition: SchemaDefinition) => {
    capturedDefinition = definition;
    const schema = new actual.Schema(definition);
    const originalIndex = schema.index.bind(schema);
    schema.index = (fields: Record<string, unknown>, options?: object) => {
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

import { ZoneModel } from '../../../../src/infrastructure/models/zone.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
  __capturedIndexes: () => Array<{ fields: Record<string, unknown>; options?: object }>;
};

describe('ZoneModel (mongoose model)', () => {
  let schemaDefinition: mongoose.SchemaDefinition | null;

  beforeAll(() => {
    schemaDefinition = mockedMongoose.__capturedDefinition();
  });

  it('should define the model with name "Zone"', () => {
    expect(ZoneModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Zone', expect.anything());
  });

  it('should use a numeric _id', () => {
    const idDef = schemaDefinition?._id as { type: NumberConstructor };
    expect(idDef.type).toBe(Number);
  });

  it('should require name (unique) and type', () => {
    expect(schemaDefinition?.name).toHaveProperty('required', true);
    expect(schemaDefinition?.name).toHaveProperty('unique', true);
    expect(schemaDefinition?.type).toHaveProperty('required', true);
  });

  it('should configure type with the ZoneType enum', () => {
    const typeDef = schemaDefinition?.type as { enum?: string[] };
    expect(typeDef.enum).toEqual(Object.values(ZoneType));
  });

  it('should declare a 2dsphere index on polygon and an index on type', () => {
    const indexes = mockedMongoose.__capturedIndexes();
    expect(indexes).toContainEqual(expect.objectContaining({ fields: { polygon: '2dsphere' } }));
    expect(indexes).toContainEqual(expect.objectContaining({ fields: { type: 1 } }));
  });
});
