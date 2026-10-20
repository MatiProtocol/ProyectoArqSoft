import mongoose, { type SchemaDefinition } from 'mongoose';

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  let capturedDefinition: SchemaDefinition | null = null;
  const mockSchema = jest.fn((definition: SchemaDefinition, options: mongoose.SchemaOptions) => {
    capturedDefinition = definition;
    return new actual.Schema(definition, options);
  });
  (mockSchema as typeof mockSchema & { Types: typeof actual.Schema.Types }).Types =
    actual.Schema.Types;
  return {
    ...actual,
    Schema: mockSchema,
    model: jest.fn().mockImplementation((name, schema) => ({ name, schema })),
    __capturedDefinition: () => capturedDefinition,
  };
});

import { ZoneModel } from '../../../../src/infrastructure/models/zone.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('ZoneModel (read-only, mongoose model)', () => {
  it('should define the model with name "Zone"', () => {
    expect(ZoneModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Zone', expect.anything());
  });

  it('should mark required fields', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.name).toHaveProperty('required', true);
    expect(definition?.type).toHaveProperty('required', true);
  });
});
