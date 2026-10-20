import { RuleModel } from '../../../../src/infrastructure/models/rule.model';
import { seedRules } from '../../../../src/infrastructure/seed/seed-rules';

jest.mock('../../../../src/infrastructure/models/rule.model', () => ({
  RuleModel: { bulkWrite: jest.fn() },
}));

const mockBulkWrite = (RuleModel as unknown as { bulkWrite: jest.Mock }).bulkWrite;

describe('seedRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkWrite.mockResolvedValue(undefined);
  });

  it('should idempotently upsert the three F8 rules keyed by numeric id', async () => {
    await seedRules();

    expect(mockBulkWrite).toHaveBeenCalledTimes(1);
    const operations = mockBulkWrite.mock.calls[0][0] as Array<{
      updateOne: { filter: { _id: number }; update: { $set: { type: string } }; upsert: boolean };
    }>;

    expect(operations).toHaveLength(3);
    expect(operations.map((op) => op.updateOne.filter._id)).toEqual([1, 2, 3]);
    expect(operations.map((op) => op.updateOne.update.$set.type)).toEqual([
      'MONITORING',
      'ALERTS',
      'SURCHARGE',
    ]);
    expect(operations.every((op) => op.updateOne.upsert === true)).toBe(true);
  });

  it('should produce the same operations when run twice (idempotent)', async () => {
    await seedRules();
    await seedRules();

    expect(mockBulkWrite).toHaveBeenCalledTimes(2);
    expect(mockBulkWrite.mock.calls[0][0]).toEqual(mockBulkWrite.mock.calls[1][0]);
  });
});
