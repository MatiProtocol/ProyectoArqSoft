import { RuleType } from '../../domain/enums/rule-type';
import { RuleModel } from '../models/rule.model';

const SEED_RULES: { id: number; type: RuleType; description: string }[] = [
  {
    id: 1,
    type: RuleType.MONITORING,
    description: 'Category needs particular monitoring during transport.',
  },
  {
    id: 2,
    type: RuleType.ALERTS,
    description: 'Category generates alerts when being transported.',
  },
  {
    id: 3,
    type: RuleType.SURCHARGE,
    description: 'Category incurs additional costs for the transport.',
  },
];

export async function seedRules(): Promise<void> {
  await RuleModel.bulkWrite(
    SEED_RULES.map((rule) => ({
      updateOne: {
        filter: { _id: rule.id },
        update: { $set: { type: rule.type, description: rule.description } },
        upsert: true,
      },
    }))
  );
}
