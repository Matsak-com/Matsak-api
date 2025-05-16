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

  // You can add custom methods here if needed
}
