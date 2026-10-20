import type { RuleReadDto } from '../../../domain/dtos/rule.dto';
import type { IRuleReadRepository } from '../../../domain/repositories/rule.read.repository';

export class ListRulesHandler {
  constructor(private readonly readRepository: IRuleReadRepository) {}

  async execute(): Promise<RuleReadDto[]> {
    return this.readRepository.getAll();
  }
}
