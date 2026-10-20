import { ErrorFactory } from '@move/errors-lib';
import { MongoServerError } from 'mongodb';
import type { UpdateCategoryDto } from '../../domain/dtos/category.dto';
import type { Category } from '../../domain/entities/category';
import { CategorySource } from '../../domain/enums/category-source';
import type {
  BulkUpsertResult,
  CsvUpsertRow,
  ICategoryWriteRepository,
} from '../../domain/repositories/category.write.repository';
import { CategoryModel } from '../models/category.model';

const MAX_ID_GENERATION_ATTEMPTS = 5;

export class CategoryWriteRepository implements ICategoryWriteRepository {
  async create(category: Category): Promise<void> {
    for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt++) {
      const nextId = await this.nextId();
      const categoryDocument = new CategoryModel({
        _id: nextId,
        nameEn: category.nameEn,
        nameEs: category.nameEs,
        description: category.description,
        source: category.source,
      });

      try {
        await categoryDocument.save();
        return;
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
          if (error.keyPattern?._id) {
            continue;
          }
          throw ErrorFactory.conflict('A category with this name already exists.');
        }
        throw error;
      }
    }

    throw ErrorFactory.conflict('Could not assign a unique id for the new category, please retry.');
  }

  async updateCatalog(id: number, dto: UpdateCategoryDto): Promise<void> {
    const update: Record<string, unknown> = {};
    if (dto.nameEs !== undefined) update.nameEs = dto.nameEs;
    if (dto.description !== undefined) update.description = dto.description;

    const result = await CategoryModel.updateOne({ _id: id }, { $set: update });
    if (result.matchedCount === 0) {
      throw ErrorFactory.notFound('Category', id);
    }
  }

  async setRules(id: number, rules: { id: number; type: string }[]): Promise<void> {
    const result = await CategoryModel.updateOne({ _id: id }, { $set: { rules } });
    if (result.matchedCount === 0) {
      throw ErrorFactory.notFound('Category', id);
    }
  }

  async bulkUpsertFromCsv(rows: CsvUpsertRow[]): Promise<BulkUpsertResult> {
    if (rows.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    const result = await CategoryModel.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { _id: row.id },
          update: {
            $set: {
              nameEn: row.nameEn,
              nameEs: row.nameEs,
              description: row.description,
              source: CategorySource.CSV,
            },
          },
          upsert: true,
        },
      }))
    );

    return {
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
    };
  }

  private async nextId(): Promise<number> {
    const last = await CategoryModel.findOne().sort({ _id: -1 }).select('_id').lean();
    return (last?._id ?? 0) + 1;
  }
}
