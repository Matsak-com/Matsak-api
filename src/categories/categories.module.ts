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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: SubCategory.name, schema: SubCategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryRepository],
  exports: [CategoriesService, MongooseModule, CategoryRepository],
})
export class CategoriesModule {}
