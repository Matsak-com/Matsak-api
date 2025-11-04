import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category, CategorySchema } from './category.schema';
import {
  SubCategory,
  SubCategorySchema,
} from '../sub-categories/sub-category.schema';
import { CategoryRepository } from './categories.repository';
import { SubCategoryRepository } from '../sub-categories/sub-categories.repository';
import { AwsS3Service } from '../aws/aws-s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: SubCategory.name, schema: SubCategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoryRepository,
    SubCategoryRepository,
    AwsS3Service,
  ],
  exports: [CategoriesService, MongooseModule, CategoryRepository],
})
export class CategoriesModule {}
