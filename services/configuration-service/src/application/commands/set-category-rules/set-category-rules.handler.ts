import { ErrorFactory } from '@move/errors-lib';
import type { CategoryReadDto } from '../../../domain/dtos/category.dto';
import type { IBookingUsageReadRepository } from '../../../domain/repositories/booking-usage.read.repository';
import type { ICategoryReadRepository } from '../../../domain/repositories/category.read.repository';
import type { ICategoryWriteRepository } from '../../../domain/repositories/category.write.repository';
import type { IRuleReadRepository } from '../../../domain/repositories/rule.read.repository';
import type { SetCategoryRulesCommand } from './set-category-rules.command';

const MAX_CATEGORIES_WITH_RULES = 5;

export class SetCategoryRulesHandler {
  constructor(
    private readonly categoryReadRepository: ICategoryReadRepository,
    private readonly categoryWriteRepository: ICategoryWriteRepository,
    private readonly ruleReadRepository: IRuleReadRepository,
    private readonly bookingUsageReadRepository: IBookingUsageReadRepository
  ) {}

  async execute(command: SetCategoryRulesCommand): Promise<void> {
    const category = await this.categoryReadRepository.findById(command.categoryId);
    if (!category) {
      throw ErrorFactory.notFound('Category', command.categoryId);
    }

    const used = await this.bookingUsageReadRepository.isCategoryUsed(category.nameEn);
    if (used) {
      throw ErrorFactory.conflict(
        'Category rules are frozen because the category was already used in a booking.'
      );
    }

    if (command.ruleIds.length === 0) {
      await this.categoryWriteRepository.setRules(command.categoryId, []);
      return;
    }

    const allRules = await this.ruleReadRepository.getAll();
    await this.validateRuleIdsExist(
      command.ruleIds,
      allRules.map((r) => r.id)
    );
    await this.enforceCategoryCap(category, command.ruleIds.length);

    const ruleTypeMap = new Map(allRules.map((r) => [r.id, r.type]));
    const expandedRules = command.ruleIds.map((id) => ({ id, type: ruleTypeMap.get(id)! }));

    await this.categoryWriteRepository.setRules(command.categoryId, expandedRules);
  }

  private async validateRuleIdsExist(ruleIds: number[], validIds: number[]): Promise<void> {
    if (ruleIds.length === 0) return;

    const validRuleIdSet = new Set(validIds);
    const unknownRuleId = ruleIds.find((ruleId) => !validRuleIdSet.has(ruleId));
    if (unknownRuleId !== undefined) {
      throw ErrorFactory.badRequest(`Rule ${unknownRuleId} does not exist.`);
    }
  }

  private async enforceCategoryCap(category: CategoryReadDto, newRuleCount: number): Promise<void> {
    const willHaveRules = newRuleCount > 0;
    const alreadyHadRules = category.rules.length > 0;
    if (!willHaveRules || alreadyHadRules) return;

    const categoriesWithRules = await this.categoryReadRepository.countWithRules();
    if (categoriesWithRules >= MAX_CATEGORIES_WITH_RULES) {
      throw ErrorFactory.conflict(
        `At most ${MAX_CATEGORIES_WITH_RULES} categories may have rules defined.`
      );
    }
  }
}
