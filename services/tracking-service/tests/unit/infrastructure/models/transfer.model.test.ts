import mongoose, { type SchemaDefinition } from 'mongoose';
import { TransferStatus } from '../../../../src/domain/enums/transfer-status';

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

import { TransferModel } from '../../../../src/infrastructure/models/transfer.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('TransferModel (mongoose model)', () => {
  it('should define the model with name "Transfer"', () => {
    expect(TransferModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Transfer', expect.anything());
  });

  it('should configure the status enum and default', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.status).toHaveProperty('enum', Object.values(TransferStatus));
    expect(definition?.status).toHaveProperty('default', TransferStatus.ASSIGNED);
  });

  it('should mark required and optional fields', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.bookingId).toHaveProperty('required', true);
    expect(definition?.vehicleId).toHaveProperty('required', true);
    expect(definition?.driverId).toHaveProperty('required', true);
    expect(definition?.category).toHaveProperty('required', false);
    expect(definition?.hasActiveAlerts).toHaveProperty('default', false);
  });

  it('should configure origin and destination as coordinate arrays', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.origin).toHaveProperty('type', [Number]);
    expect(definition?.destination).toHaveProperty('type', [Number]);
  });
});
