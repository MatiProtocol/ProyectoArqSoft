import { SetCategoryRulesCommand } from '../../../../../src/application/commands/set-category-rules/set-category-rules.command';
import { SetCategoryRulesHandler } from '../../../../../src/application/commands/set-category-rules/set-category-rules.handler';
import type { CategoryReadDto } from '../../../../../src/domain/dtos/category.dto';
import type { IBookingUsageReadRepository } from '../../../../../src/domain/repositories/booking-usage.read.repository';
import type { ICategoryReadRepository } from '../../../../../src/domain/repositories/category.read.repository';
import type { ICategoryWriteRepository } from '../../../../../src/domain/repositories/category.write.repository';
import type { IRuleReadRepository } from '../../../../../src/domain/repositories/rule.read.repository';

function buildCategory(overrides: Partial<CategoryReadDto> = {}): CategoryReadDto {
  return {
    id: 7,
    nameEn: 'Electronics',
    nameEs: 'Electrónica',
    description: 'Devices',
    rules: [],
    ...overrides,
  };
}

const ALL_RULES = [
  { id: 1, type: 'MONITORING' },
  { id: 2, type: 'ALERTS' },
  { id: 3, type: 'SURCHARGE' },
];

function setup() {
  const categoryRead: jest.Mocked<ICategoryReadRepository> = {
    getAllActive: jest.fn(),
    findById: jest.fn(),
    countWithRules: jest.fn(),
  };
  const categoryWrite: jest.Mocked<ICategoryWriteRepository> = {
    create: jest.fn(),
    updateCatalog: jest.fn(),
    bulkUpsertFromCsv: jest.fn(),
    setRules: jest.fn(),
  };
  const ruleRead: jest.Mocked<IRuleReadRepository> = { getAll: jest.fn() };
  const bookingUsageRead: jest.Mocked<IBookingUsageReadRepository> = { isCategoryUsed: jest.fn() };

  categoryRead.findById.mockResolvedValue(buildCategory());
  categoryRead.countWithRules.mockResolvedValue(0);
  ruleRead.getAll.mockResolvedValue(ALL_RULES);
  bookingUsageRead.isCategoryUsed.mockResolvedValue(false);

  const handler = new SetCategoryRulesHandler(
    categoryRead,
    categoryWrite,
    ruleRead,
    bookingUsageRead
  );
  return { handler, categoryRead, categoryWrite, ruleRead, bookingUsageRead };
}

describe('SetCategoryRulesHandler', () => {
  it('sets the rules when all validations pass', async () => {
    const { handler, categoryWrite, bookingUsageRead } = setup();

    await handler.execute(new SetCategoryRulesCommand(7, [2, 3]));

    expect(bookingUsageRead.isCategoryUsed).toHaveBeenCalledWith('Electronics');
    expect(categoryWrite.setRules).toHaveBeenCalledWith(7, [
      { id: 2, type: 'ALERTS' },
      { id: 3, type: 'SURCHARGE' },
    ]);
  });

  it('clears the rules when given an empty array (and the category is not used)', async () => {
    const { handler, categoryRead, categoryWrite } = setup();
    categoryRead.findById.mockResolvedValue(
      buildCategory({
        rules: [
          { id: 2, type: 'ALERTS' },
          { id: 3, type: 'SURCHARGE' },
        ],
      })
    );

    await handler.execute(new SetCategoryRulesCommand(7, []));

    expect(categoryWrite.setRules).toHaveBeenCalledWith(7, []);
  });

  it('rejects with 404 when the category does not exist', async () => {
    const { handler, categoryRead, categoryWrite } = setup();
    categoryRead.findById.mockResolvedValue(null);

    await expect(handler.execute(new SetCategoryRulesCommand(99, [2]))).rejects.toMatchObject({
      status: 404,
    });
    expect(categoryWrite.setRules).not.toHaveBeenCalled();
  });

  it('rejects with 409 (frozen) when the category was already used in a booking', async () => {
    const { handler, bookingUsageRead, categoryWrite } = setup();
    bookingUsageRead.isCategoryUsed.mockResolvedValue(true);

    await expect(handler.execute(new SetCategoryRulesCommand(7, [2]))).rejects.toMatchObject({
      status: 409,
    });
    expect(categoryWrite.setRules).not.toHaveBeenCalled();
  });

  it('rejects with 409 (frozen) even when clearing the rules of a used category', async () => {
    const { handler, bookingUsageRead, categoryRead, categoryWrite } = setup();
    categoryRead.findById.mockResolvedValue(buildCategory({ rules: [{ id: 2, type: 'ALERTS' }] }));
    bookingUsageRead.isCategoryUsed.mockResolvedValue(true);

    await expect(handler.execute(new SetCategoryRulesCommand(7, []))).rejects.toMatchObject({
      status: 409,
    });
    expect(categoryWrite.setRules).not.toHaveBeenCalled();
  });

  it('rejects with 400 when a rule id does not exist', async () => {
    const { handler, categoryWrite } = setup();

    await expect(handler.execute(new SetCategoryRulesCommand(7, [2, 99]))).rejects.toMatchObject({
      status: 400,
    });
    expect(categoryWrite.setRules).not.toHaveBeenCalled();
  });

  it('rejects with 409 when the 5-category cap is reached and the category had no rules', async () => {
    const { handler, categoryRead, categoryWrite } = setup();
    categoryRead.countWithRules.mockResolvedValue(5);

    await expect(handler.execute(new SetCategoryRulesCommand(7, [2]))).rejects.toMatchObject({
      status: 409,
    });
    expect(categoryWrite.setRules).not.toHaveBeenCalled();
  });

  it('does not apply the cap when the category already had rules', async () => {
    const { handler, categoryRead, categoryWrite } = setup();
    categoryRead.findById.mockResolvedValue(buildCategory({ rules: [{ id: 2, type: 'ALERTS' }] }));
    categoryRead.countWithRules.mockResolvedValue(5);

    await handler.execute(new SetCategoryRulesCommand(7, [2, 3]));

    expect(categoryRead.countWithRules).not.toHaveBeenCalled();
    expect(categoryWrite.setRules).toHaveBeenCalledWith(7, [
      { id: 2, type: 'ALERTS' },
      { id: 3, type: 'SURCHARGE' },
    ]);
  });

  it('does not apply the cap when clearing rules', async () => {
    const { handler, categoryRead, categoryWrite } = setup();
    categoryRead.countWithRules.mockResolvedValue(5);

    await handler.execute(new SetCategoryRulesCommand(7, []));

    expect(categoryRead.countWithRules).not.toHaveBeenCalled();
    expect(categoryWrite.setRules).toHaveBeenCalledWith(7, []);
  });

  it('does not validate rule existence for an empty set', async () => {
    const { handler, ruleRead } = setup();

    await handler.execute(new SetCategoryRulesCommand(7, []));

    expect(ruleRead.getAll).not.toHaveBeenCalled();
  });
});
