import mongoose, { type SchemaDefinition } from 'mongoose';
import { BookingCustomerType } from '../../../../src/domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../../src/domain/enums/booking-performance-tier';
import { BookingStatus } from '../../../../src/domain/enums/booking-status';
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
    model: jest.fn().mockImplementation((name, schema) => ({ name, schema })),
    __capturedDefinition: () => capturedDefinition,
    __capturedOptions: () => capturedOptions,
  };
});

import { BookingModel } from '../../../../src/infrastructure/models/booking.model';

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose> & {
  __capturedDefinition: () => mongoose.SchemaDefinition | null;
  __capturedOptions: () => mongoose.SchemaOptions | null;
};

describe('BookingModel (mongoose model)', () => {
  let schemaDefinition: mongoose.SchemaDefinition | null;
  let schemaOptions: mongoose.SchemaOptions | null;

  beforeAll(() => {
    schemaDefinition = mockedMongoose.__capturedDefinition();
    schemaOptions = mockedMongoose.__capturedOptions();
  });

  it('should define the model with name "Booking"', () => {
    expect(BookingModel).toBeDefined();
    expect(mockedMongoose.model).toHaveBeenCalledWith('Booking', expect.anything());
  });

  it('should have required fields in schema', () => {
    expect(schemaDefinition).toHaveProperty('_id');
    expect(schemaDefinition).toHaveProperty('userId');
    expect(schemaDefinition).toHaveProperty('origin');
    expect(schemaDefinition).toHaveProperty('destination');
    expect(schemaDefinition).toHaveProperty('date');
    expect(schemaDefinition).toHaveProperty('items');
    expect(schemaDefinition).toHaveProperty('category');
    expect(schemaDefinition).toHaveProperty('status');
    expect(schemaDefinition).toHaveProperty('customerType');
    expect(schemaDefinition).toHaveProperty('performanceTier');
  });

  it('should mark _id, userId, origin, destination, date and status as required', () => {
    const requiredFields = [
      '_id',
      'userId',
      'origin',
      'destination',
      'date',
      'status',
      'customerType',
      'performanceTier',
    ];
    requiredFields.forEach((field) => {
      const fieldDef = schemaDefinition?.[field];
      expect(fieldDef).toHaveProperty('required', true);
    });
  });

  it('should configure category as optional String', () => {
    const categoryDef = schemaDefinition?.category;

    expect(categoryDef).toHaveProperty('type', String);
    expect(categoryDef).toHaveProperty('required', false);
  });

  it('should configure origin and destination as coordinate arrays', () => {
    expect(schemaDefinition?.origin).toHaveProperty('type', [Number]);
    expect(schemaDefinition?.destination).toHaveProperty('type', [Number]);
  });

  it('should configure items as embedded subdocuments', () => {
    const itemsDef = schemaDefinition?.items as {
      type: unknown[];
      required?: boolean;
      default?: unknown[];
    };

    expect(itemsDef.type).toHaveLength(1);
    expect(itemsDef).toHaveProperty('required', true);
    expect(itemsDef).toHaveProperty('default', []);
  });

  it('should configure embedded item fields', () => {
    const itemsDef = schemaDefinition?.items as { type: mongoose.Schema[] };
    const itemSchema = itemsDef.type[0];
    const itemDefinition = itemSchema.obj;

    expect(itemDefinition).toHaveProperty('_id');
    expect(itemDefinition).toHaveProperty('description');
    expect(itemDefinition).toHaveProperty('category');
    expect(itemDefinition).toHaveProperty('value');
    expect(itemDefinition).toHaveProperty('size');
    expect(itemDefinition._id).toHaveProperty('type', mongoose.Schema.Types.ObjectId);
    expect(itemDefinition._id).toHaveProperty('required', true);
    expect(itemDefinition.description).toHaveProperty('type', String);
    expect(itemDefinition.description).toHaveProperty('required', true);
    expect(itemDefinition.size).toHaveProperty('enum', Object.values(ItemSize));
    expect(itemDefinition.size).toHaveProperty('default', ItemSize.SMALL);
  });

  it('should configure status with enum and default value', () => {
    const statusDef = schemaDefinition?.status as {
      type: StringConstructor;
      enum?: BookingStatus[];
      default?: BookingStatus;
      required?: boolean;
    };

    expect(statusDef).toBeDefined();
    expect(statusDef.type).toBe(String);
    expect(statusDef.enum).toEqual(Object.values(BookingStatus));
    expect(statusDef.default).toBe(BookingStatus.PENDING_CLASSIFICATION);
    expect(statusDef.required).toBe(true);
  });

  it('should configure R1 customer type and performance tier with defaults', () => {
    const customerTypeDef = schemaDefinition?.customerType as {
      type: StringConstructor;
      enum?: BookingCustomerType[];
      default?: BookingCustomerType;
      required?: boolean;
    };
    const performanceTierDef = schemaDefinition?.performanceTier as {
      type: StringConstructor;
      enum?: BookingPerformanceTier[];
      default?: BookingPerformanceTier;
      required?: boolean;
    };

    expect(customerTypeDef.type).toBe(String);
    expect(customerTypeDef.enum).toEqual(Object.values(BookingCustomerType));
    expect(customerTypeDef.default).toBe(BookingCustomerType.INDIVIDUAL);
    expect(customerTypeDef.required).toBe(true);
    expect(performanceTierDef.type).toBe(String);
    expect(performanceTierDef.enum).toEqual(Object.values(BookingPerformanceTier));
    expect(performanceTierDef.default).toBe(BookingPerformanceTier.INDIVIDUAL);
    expect(performanceTierDef.required).toBe(true);
  });

  it('should use Date type for date', () => {
    const dateDef = schemaDefinition?.date;
    expect(dateDef).toHaveProperty('type', Date);
  });

  it('should enable timestamps and disable version key', () => {
    expect(schemaOptions).toHaveProperty('timestamps', true);
    expect(schemaOptions).toHaveProperty('versionKey', false);
  });

  it('should define the frequent company client ranking index', () => {
    expect(BookingModel.schema.indexes()).toContainEqual([
      { customerType: 1, createdAt: -1, userId: 1 },
      {},
    ]);
  });

  it('should configure payment as an optional embedded subdocument', () => {
    const paymentDef = schemaDefinition?.payment as { type: mongoose.Schema; required?: boolean };

    expect(paymentDef).toHaveProperty('required', false);
    expect(paymentDef.type.constructor.name).toBe('Schema');
  });

  it('should configure the payment subdocument fields', () => {
    const paymentDef = schemaDefinition?.payment as { type: mongoose.Schema };
    const paymentDefinition = paymentDef.type.obj as Record<string, { required?: boolean }>;

    expect(paymentDefinition).toHaveProperty('status');
    expect(paymentDefinition).toHaveProperty('amount');
    expect(paymentDefinition).toHaveProperty('provider');
    expect(paymentDefinition).toHaveProperty('reference');
    expect(paymentDefinition).toHaveProperty('reason');
    expect(paymentDefinition).toHaveProperty('attempts');
    expect(paymentDefinition).toHaveProperty('paidAt');
    expect(paymentDefinition).toHaveProperty('updatedAt');
    expect(paymentDefinition.status).toHaveProperty('required', true);
    expect(paymentDefinition.amount).toHaveProperty('required', true);
    expect(paymentDefinition.updatedAt).toHaveProperty('required', true);
  });
});
