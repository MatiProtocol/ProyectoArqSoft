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

import { VehicleModel } from '../../../../src/infrastructure/models/vehicle.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('VehicleModel (read-only, mongoose model)', () => {
  it('should define the model with name "Vehicle"', () => {
    expect(VehicleModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Vehicle', expect.anything());
  });

  it('should mark required fields and default availability', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.licensePlate).toHaveProperty('required', true);
    expect(definition?.capacity).toHaveProperty('required', true);
    expect(definition?.available).toHaveProperty('default', true);
  });
});
