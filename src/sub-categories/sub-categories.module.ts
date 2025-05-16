// src/sub-categories/sub-categories.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubCategoriesService } from './sub-categories.service';
import { SubCategoriesController } from './sub-categories.controller';
import { SubCategory, SubCategorySchema } from './sub-category.schema';
import { CategoriesModule } from '../categories/categories.module';
import { SubCategoryRepository } from './sub-categories.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubCategory.name, schema: SubCategorySchema },
    ]),
    CategoriesModule,
  ],
  controllers: [SubCategoriesController],
  providers: [SubCategoriesService, SubCategoryRepository],
  exports: [SubCategoriesService, SubCategoryRepository],
})
export class SubCategoriesModule {}
