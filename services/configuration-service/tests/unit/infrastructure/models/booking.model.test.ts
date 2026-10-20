import mongoose, { type SchemaDefinition } from 'mongoose';

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  let capturedDefinition: SchemaDefinition | null = null;
  const mockSchema = jest.fn((definition: SchemaDefinition, options?: object) => {
    capturedDefinition = definition;
    return new actual.Schema(definition, options);
  });
  (mockSchema as typeof mockSchema & { Types: unknown }).Types = actual.Schema.Types;
  return {
    ...actual,
    Schema: mockSchema,
    model: jest.fn().mockImplementation((name, schema) => ({ name, schema })),
    __capturedDefinition: () => capturedDefinition,
  };
});

import { BookingModel } from '../../../../src/infrastructure/models/booking.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('BookingModel (read-only shared model)', () => {
  it('should register a model named "Booking"', () => {
    expect(BookingModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Booking', expect.anything());
  });

  it('should expose category and items fields for the usage check', () => {
    const definition = mockedMongoose.__capturedDefinition();
    expect(definition).toHaveProperty('category');
    expect(definition).toHaveProperty('items');
  });
});
