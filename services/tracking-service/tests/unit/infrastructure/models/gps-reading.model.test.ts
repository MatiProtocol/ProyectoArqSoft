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

import { GpsReadingModel } from '../../../../src/infrastructure/models/gps-reading.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('GpsReadingModel (mongoose model)', () => {
  it('should define the model with name "GpsReading"', () => {
    expect(GpsReadingModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('GpsReading', expect.anything());
  });

  it('should mark required fields and configure the receivedAt TTL default', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.transferId).toHaveProperty('required', true);
    expect(definition?.vehicleId).toHaveProperty('required', true);
    expect(definition?.deviceId).toHaveProperty('required', true);
    expect(definition?.timestamp).toHaveProperty('required', true);
    expect(definition?.receivedAt).toHaveProperty('default', Date.now);
  });
});
