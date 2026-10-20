import mongoose, { type SchemaDefinition } from 'mongoose';
import { ItemSize } from '../../../../src/domain/enums/item-size';

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  let capturedDefinition: SchemaDefinition | null = null;
  let capturedOptions: mongoose.SchemaOptions | null = null;
  const mockSchema = jest.fn((definition: SchemaDefinition, options: mongoose.SchemaOptions) => {
    capturedDefinition = definition;
    capturedOptions = options;
    return new actual.Schema(definition, options);
  });
  (mockSchema as typeof mockSchema & { Types: typeof actual.Schema.Types }).Types =
    actual.Schema.Types;
  return {
    ...actual,
    Schema: mockSchema,
    model: jest.fn().mockImplementation((name, schema, collection) => ({
      name,
      schema,
      collection,
    })),
    __capturedDefinition: () => capturedDefinition,
    __capturedOptions: () => capturedOptions,
  };
});

import { CompanyPreregistrationModel } from '../../../../src/infrastructure/models/company-preregistration.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
  __capturedOptions: () => mongoose.SchemaOptions | null;
};

describe('CompanyPreregistrationModel (mongoose model)', () => {
  let schemaDefinition: mongoose.SchemaDefinition | null;
  let schemaOptions: mongoose.SchemaOptions | null;

  beforeAll(() => {
    schemaDefinition = mockedMongoose.__capturedDefinition();
    schemaOptions = mockedMongoose.__capturedOptions();
  });

  it('should define the model with collection "company_preregistrations"', () => {
    expect(CompanyPreregistrationModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith(
      'CompanyPreregistration',
      expect.anything(),
      'company_preregistrations'
    );
  });

  it('should have expected fields in schema', () => {
    expect(schemaDefinition).toHaveProperty('_id');
    expect(schemaDefinition).toHaveProperty('companyUserId');
    expect(schemaDefinition).toHaveProperty('origins');
    expect(schemaDefinition).toHaveProperty('destinations');
    expect(schemaDefinition).toHaveProperty('items');
  });

  it('should mark _id and companyUserId as required', () => {
    const requiredFields = ['_id', 'companyUserId'];
    requiredFields.forEach((field) => {
      const fieldDef = schemaDefinition?.[field];
      expect(fieldDef).toHaveProperty('required', true);
    });
  });

  it('should configure origins and destinations as required location lists', () => {
    const originsDef = schemaDefinition?.origins as {
      type: Array<{ _id: unknown; coordinates: unknown }>;
      required?: boolean;
      default?: unknown[];
    };
    const destinationsDef = schemaDefinition?.destinations as {
      type: Array<{ _id: unknown; coordinates: unknown }>;
      required?: boolean;
      default?: unknown[];
    };

    expect(originsDef.required).toBe(true);
    expect(originsDef.default).toEqual([]);
    expect(originsDef.type[0]._id).toHaveProperty('type', mongoose.Schema.Types.ObjectId);
    expect(originsDef.type[0]._id).toHaveProperty('required', true);
    expect(originsDef.type[0].coordinates).toHaveProperty('type', [Number]);
    expect(originsDef.type[0].coordinates).toHaveProperty('required', true);

    expect(destinationsDef.required).toBe(true);
    expect(destinationsDef.default).toEqual([]);
    expect(destinationsDef.type[0]._id).toHaveProperty('type', mongoose.Schema.Types.ObjectId);
    expect(destinationsDef.type[0]._id).toHaveProperty('required', true);
    expect(destinationsDef.type[0].coordinates).toHaveProperty('type', [Number]);
    expect(destinationsDef.type[0].coordinates).toHaveProperty('required', true);
  });

  it('should configure items as required preregistered item list', () => {
    const itemsDef = schemaDefinition?.items as {
      type: Array<{
        _id: unknown;
        description: unknown;
        category: unknown;
        value: unknown;
        size: unknown;
      }>;
      required?: boolean;
      default?: unknown[];
    };
    const itemDef = itemsDef.type[0] as {
      _id: unknown;
      description: unknown;
      category: unknown;
      value: unknown;
      size: {
        type: StringConstructor;
        enum?: ItemSize[];
        required?: boolean;
      };
    };

    expect(itemsDef.required).toBe(true);
    expect(itemsDef.default).toEqual([]);
    expect(itemDef._id).toHaveProperty('type', mongoose.Schema.Types.ObjectId);
    expect(itemDef._id).toHaveProperty('required', true);
    expect(itemDef.description).toHaveProperty('type', String);
    expect(itemDef.description).toHaveProperty('required', true);
    expect(itemDef.category).toHaveProperty('type', String);
    expect(itemDef.category).toHaveProperty('required', true);
    expect(itemDef.value).toHaveProperty('type', String);
    expect(itemDef.value).toHaveProperty('required', false);
    expect(itemDef.size.type).toBe(String);
    expect(itemDef.size.enum).toEqual(Object.values(ItemSize));
    expect(itemDef.size.required).toBe(false);
  });

  it('should enable timestamps and disable version key', () => {
    expect(schemaOptions).toHaveProperty('timestamps', true);
    expect(schemaOptions).toHaveProperty('versionKey', false);
  });

  it('should configure a unique company lookup index', () => {
    const indexes = (
      CompanyPreregistrationModel as unknown as { schema: mongoose.Schema }
    ).schema.indexes();

    expect(indexes).toEqual(expect.arrayContaining([[{ companyUserId: 1 }, { unique: true }]]));
  });
});
