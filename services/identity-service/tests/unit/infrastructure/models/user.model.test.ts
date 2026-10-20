import mongoose, { type SchemaDefinition } from 'mongoose';
import { UserRole } from '../../../../src/domain/enums/user-role';

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

import { UserModel } from '../../../../src/infrastructure/models/user.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
};

describe('UserModel (mongoose model)', () => {
  let schemaDefinition: mongoose.SchemaDefinition | null;

  beforeAll(() => {
    schemaDefinition = mockedMongoose.__capturedDefinition();
  });

  it('should define the model with name "User"', () => {
    expect(UserModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('User', expect.anything());
  });

  it('should have required fields in schema', () => {
    expect(schemaDefinition).toHaveProperty('_id');
    expect(schemaDefinition).toHaveProperty('email');
    expect(schemaDefinition).toHaveProperty('name');
    expect(schemaDefinition).toHaveProperty('roles');
    expect(schemaDefinition).toHaveProperty('phone');
    expect(schemaDefinition).toHaveProperty('city');
  });

  it('should mark _id, email, name, phone, city as required', () => {
    const requiredFields = ['_id', 'email', 'name', 'phone', 'city'];
    requiredFields.forEach((field) => {
      const fieldDef = schemaDefinition?.[field];
      expect(fieldDef).toHaveProperty('required', true);
    });
  });

  it('should set email as unique', () => {
    const emailDef = schemaDefinition?.email;
    expect(emailDef).toHaveProperty('unique', true);
  });

  it('should configure roles with enum and default value', () => {
    const rolesDef = schemaDefinition?.roles as {
      type: string | string[];
      enum?: string[];
      default?: UserRole[];
    };
    expect(rolesDef).toBeDefined();
    expect(rolesDef.type).toEqual([String]);
    expect(rolesDef.enum).toEqual(Object.values(UserRole));
    expect(rolesDef.default).toEqual([UserRole.CLIENT_INDIVIDUAL]);
  });

  it('should use String type for _id', () => {
    const idDef = schemaDefinition?._id;
    expect(idDef).toHaveProperty('type', String);
  });
});
