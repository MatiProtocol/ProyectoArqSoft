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

import { BookingModel } from '../../../../src/infrastructure/models/booking.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('BookingModel (read-only, mongoose model)', () => {
  it('should define the model with name "Booking"', () => {
    expect(BookingModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Booking', expect.anything());
  });

  it('should mark required fields', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.status).toHaveProperty('required', true);
    expect(definition?.origin).toHaveProperty('required', true);
    expect(definition?.destination).toHaveProperty('required', true);
    expect(definition?.category).toHaveProperty('required', false);
  });

  it('should configure origin and destination as coordinate arrays', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.origin).toHaveProperty('type', [Number]);
    expect(definition?.destination).toHaveProperty('type', [Number]);
  });
});
