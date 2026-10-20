import mongoose, { type SchemaDefinition } from 'mongoose';
import { VehicleType } from '../../../../src/domain/enums/vehicle-type';

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
  Object.assign(mockSchema, { Types: actual.Schema.Types });
  return {
    ...actual,
    Schema: mockSchema,
    model: jest.fn().mockImplementation((name, schema) => ({ name, schema })),
    __capturedDefinition: () => capturedDefinition,
    __capturedIndexes: () => capturedIndexes,
  };
});

import { VehicleModel } from '../../../../src/infrastructure/models/vehicle.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
  __capturedIndexes: () => Array<{ fields: Record<string, unknown>; options?: object }>;
};

describe('VehicleModel (mongoose model)', () => {
  let schemaDefinition: mongoose.SchemaDefinition | null;

  beforeAll(() => {
    schemaDefinition = mockedMongoose.__capturedDefinition();
  });

  it('should define the model with name "Vehicle"', () => {
    expect(VehicleModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Vehicle', expect.anything());
  });

  it('should use a numeric _id', () => {
    const idDef = schemaDefinition?._id as { type: NumberConstructor };
    expect(idDef.type).toBe(Number);
  });

  it('should require licensePlate, type and capacity', () => {
    expect(schemaDefinition?.licensePlate).toHaveProperty('required', true);
    expect(schemaDefinition?.type).toHaveProperty('required', true);
    expect(schemaDefinition?.capacity).toHaveProperty('required', true);
  });

  it('should mark licensePlate unique and deviceId unique sparse', () => {
    expect(schemaDefinition?.licensePlate).toHaveProperty('unique', true);
    const deviceIdDef = schemaDefinition?.deviceId as { unique?: boolean; sparse?: boolean };
    expect(deviceIdDef.unique).toBe(true);
    expect(deviceIdDef.sparse).toBe(true);
  });

  it('should configure type with the VehicleType enum and capacity min 1', () => {
    const typeDef = schemaDefinition?.type as { enum?: string[] };
    expect(typeDef.enum).toEqual(Object.values(VehicleType));
    expect(schemaDefinition?.capacity).toHaveProperty('min', 1);
  });

  it('should default available to true', () => {
    const availableDef = schemaDefinition?.available as { default?: boolean };
    expect(availableDef.default).toBe(true);
  });

  it('should declare indexes on available and type', () => {
    const indexes = mockedMongoose.__capturedIndexes();
    expect(indexes).toContainEqual(expect.objectContaining({ fields: { available: 1 } }));
    expect(indexes).toContainEqual(expect.objectContaining({ fields: { type: 1 } }));
  });
});
