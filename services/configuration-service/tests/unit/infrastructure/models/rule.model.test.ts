import mongoose, { type SchemaDefinition } from 'mongoose';
import { RuleType } from '../../../../src/domain/enums/rule-type';

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  let capturedDefinition: SchemaDefinition | null = null;
  const mockSchema = jest.fn((definition: SchemaDefinition) => {
    capturedDefinition = definition;
    return new actual.Schema(definition);
  });
  return {
    ...actual,
    Schema: mockSchema,
    model: jest.fn().mockImplementation((name, schema) => ({ name, schema })),
    __capturedDefinition: () => capturedDefinition,
  };
});

import { RuleModel } from '../../../../src/infrastructure/models/rule.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('RuleModel (mongoose model)', () => {
  let schemaDefinition: mongoose.SchemaDefinition | null;

  beforeAll(() => {
    schemaDefinition = mockedMongoose.__capturedDefinition();
  });

  it('should define the model with name "Rule"', () => {
    expect(RuleModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Rule', expect.anything());
  });

  it('should use a numeric _id', () => {
    const idDef = schemaDefinition?._id as { type: NumberConstructor };
    expect(idDef.type).toBe(Number);
  });

  it('should configure type as a required, unique enum and a string description', () => {
    const typeDef = schemaDefinition?.type as {
      enum?: string[];
      required?: boolean;
      unique?: boolean;
    };
    expect(typeDef.enum).toEqual(Object.values(RuleType));
    expect(typeDef.required).toBe(true);
    expect(typeDef.unique).toBe(true);
    expect(schemaDefinition).toHaveProperty('description');
  });
});
