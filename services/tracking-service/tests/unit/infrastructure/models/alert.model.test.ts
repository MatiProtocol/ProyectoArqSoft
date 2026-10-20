import mongoose, { type SchemaDefinition } from 'mongoose';
import { AlertSeverity } from '../../../../src/domain/enums/alert-severity';
import { AlertType } from '../../../../src/domain/enums/alert-type';

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

import { AlertModel, AlertStatus } from '../../../../src/infrastructure/models/alert.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('AlertModel (mongoose model)', () => {
  it('should define the model with name "Alert"', () => {
    expect(AlertModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Alert', expect.anything());
  });

  it('should configure type, severity and status enums', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.type).toHaveProperty('enum', Object.values(AlertType));
    expect(definition?.severity).toHaveProperty('enum', Object.values(AlertSeverity));
    expect(definition?.status).toHaveProperty('enum', Object.values(AlertStatus));
    expect(definition?.status).toHaveProperty('default', AlertStatus.ACTIVE);
  });

  it('should mark required fields', () => {
    const definition = mockedMongoose.__capturedDefinition();

    expect(definition?.transferId).toHaveProperty('required', true);
    expect(definition?.vehicleId).toHaveProperty('required', true);
    expect(definition?.description).toHaveProperty('required', true);
    expect(definition?.occurredAt).toHaveProperty('required', true);
  });
});
