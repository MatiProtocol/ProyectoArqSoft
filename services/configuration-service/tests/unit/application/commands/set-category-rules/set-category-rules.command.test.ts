import { SetCategoryRulesCommand } from '../../../../../src/application/commands/set-category-rules/set-category-rules.command';

function expectBadRequest(build: () => unknown): void {
  expect(build).toThrow();
  try {
    build();
  } catch (error) {
    expect((error as { status?: number }).status).toBe(400);
  }
}

describe('SetCategoryRulesCommand.create', () => {
  it('should build a command from a valid id and rules array', () => {
    const command = SetCategoryRulesCommand.create('7', { rules: [2, 3] });

    expect(command.categoryId).toBe(7);
    expect(command.ruleIds).toEqual([2, 3]);
  });

  it('should accept an empty rules array', () => {
    const command = SetCategoryRulesCommand.create('7', { rules: [] });

    expect(command.ruleIds).toEqual([]);
  });

  it('should reject a missing/undefined body', () => {
    expectBadRequest(() => SetCategoryRulesCommand.create('7', undefined));
  });

  it('should reject a non-numeric category id', () => {
    expectBadRequest(() => SetCategoryRulesCommand.create('abc', { rules: [2] }));
  });

  it('should reject a rules value that is not an array', () => {
    expectBadRequest(() => SetCategoryRulesCommand.create('7', { rules: 'not-an-array' }));
  });

  it.each([
    [['a']],
    [[1.5]],
    [[0]],
    [[-1]],
  ])('should reject rule ids that are not positive integers: %p', (rules) => {
    expectBadRequest(() => SetCategoryRulesCommand.create('7', { rules }));
  });

  it('should reject duplicate rule ids', () => {
    expectBadRequest(() => SetCategoryRulesCommand.create('7', { rules: [2, 2] }));
  });
});
