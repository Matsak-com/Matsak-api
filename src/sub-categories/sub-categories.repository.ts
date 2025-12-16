import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubCategory, SubCategoryDocument } from './sub-category.schema';
import { BaseRepository } from '../common/base.repository';

@Injectable()
export class SubCategoryRepository extends BaseRepository<SubCategoryDocument> {
  constructor(
    @InjectModel(SubCategory.name)
    subCategoryModel: Model<SubCategoryDocument>,
  ) {
    super(subCategoryModel);
  }

  async softDeleteByCategory(categoryId: string): Promise<any> {
    return this.model.updateMany(
      { categoryId: categoryId, deleted_at: null },
      { $set: { deleted_at: new Date() } },
    );
  }

  /**
   * Soft delete multiple subcategories by filter
   * @param filter - Query filter to match documents
   * @returns Update result with count of modified documents
   */
  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    const result = await this.model.updateMany(
      { ...filter, deleted_at: { $exists: false } },
      { $set: { deleted_at: new Date() } },
    );
    return { deletedCount: result.modifiedCount };
  }

  /**
   * Execute bulk write operations
   * @param operations - Array of bulk operations
   * @returns Bulk write result
   */
  async bulkWrite(operations: any[]): Promise<any> {
    return this.model.bulkWrite(operations);
  }
}
