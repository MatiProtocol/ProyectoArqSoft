import { model, Schema } from 'mongoose';
import { RuleType } from '../../domain/enums/rule-type';

export interface RuleDocument {
  _id: number;
  type: RuleType;
  description?: string;
}

const ruleSchema = new Schema<RuleDocument>(
  {
    _id: { type: Number },
    type: { type: String, enum: Object.values(RuleType), required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true, versionKey: false }
);

export const RuleModel = model<RuleDocument>('Rule', ruleSchema);
