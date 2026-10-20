import type { RuleReadDto } from '../dtos/rule.dto';

export interface IRuleReadRepository {
  getAll(): Promise<RuleReadDto[]>;
}
