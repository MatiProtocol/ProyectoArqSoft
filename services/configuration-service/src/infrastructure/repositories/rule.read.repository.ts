import type { RuleReadDto } from '../../domain/dtos/rule.dto';
import type { IRuleReadRepository } from '../../domain/repositories/rule.read.repository';
import { RuleModel } from '../models/rule.model';

export class RuleReadRepository implements IRuleReadRepository {
  async getAll(): Promise<RuleReadDto[]> {
    const ruleDocuments = await RuleModel.find({}, { _id: 1, type: 1, description: 1 })
      .sort({ _id: 1 })
      .lean();

    return ruleDocuments.map((rule) => ({
      id: rule._id,
      type: rule.type,
      description: rule.description,
    }));
  }
}
