import { model, Schema } from 'mongoose';
import { CategorySource } from '../../domain/enums/category-source';

export type CategoryRuleEntry = {
  id: number;
  type: string;
};

export interface CategoryDocument extends Document {
  _id: number;
  nameEn: string;
  nameEs: string;
  description?: string;
  source: CategorySource;
  active: boolean;
  rules: CategoryRuleEntry[];
}

const categoryRuleSchema = new Schema<CategoryRuleEntry>(
  {
    id: { type: Number, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

const categorySchema = new Schema<CategoryDocument>(
  {
    _id: { type: Number },
    nameEn: { type: String, required: true },
    nameEs: { type: String, required: true },
    description: { type: String },
    source: { type: String, enum: Object.values(CategorySource), default: CategorySource.ADMIN },
    active: { type: Boolean, default: true },
    rules: { type: [categoryRuleSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

categorySchema.index({ nameEn: 1, nameEs: 1 }, { unique: true });

export const CategoryModel = model<CategoryDocument>('Category', categorySchema);
