import { ErrorFactory } from '@move/errors-lib';
import { parseNumericId } from '../../../domain/validate-numeric-id';

export class SetCategoryRulesCommand {
  constructor(
    public readonly categoryId: number,
    public readonly ruleIds: number[]
  ) {}

  static create(idParam: string, body: unknown): SetCategoryRulesCommand {
    const categoryId = parseNumericId(idParam, 'Category');

    const { rules } = (body ?? {}) as { rules?: unknown };
    if (!Array.isArray(rules)) {
      throw ErrorFactory.badRequest('rules must be an array of rule ids');
    }

    const ruleIds = rules.map((value) => {
      if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        throw ErrorFactory.badRequest('each rule id must be a positive integer');
      }
      return value;
    });

    if (new Set(ruleIds).size !== ruleIds.length) {
      throw ErrorFactory.badRequest('rules must not contain duplicate ids');
    }

    return new SetCategoryRulesCommand(categoryId, ruleIds);
  }
}
