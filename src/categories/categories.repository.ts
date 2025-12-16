import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Category, CategoryDocument } from './category.schema';

@Injectable()
export class CategoryRepository extends BaseRepository<CategoryDocument> {
  constructor(
    @InjectModel(Category.name)
    categoryModel: Model<CategoryDocument>,
  ) {
    super(categoryModel);
  }

  async getCategoriesWithSubCategories(): Promise<any[]> {
    return this.model.aggregate([
      {
        $lookup: {
          from: 'subcategories',
          let: { category_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toObjectId: '$categoryId' }, // string → ObjectId
                    '$$category_id',
                  ],
                },
              },
            },
          ],
          as: 'subCategories',
        },
      },
    ]);
  }
}
