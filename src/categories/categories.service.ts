import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './category.schema';
import {
  SubCategory,
  SubCategoryDocument,
} from '../sub-categories/sub-category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(SubCategory.name)
    private readonly subCategoryModel: Model<SubCategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoryRepository.create({ doc: createCategoryDto });
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async findOne(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        `Category with ID '${id}' is not a valid ObjectId`,
      );
    }

    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const updatedCategory = await this.categoryRepository.update({
      id,
      update: updateCategoryDto,
    });
    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return updatedCategory;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    // Soft-delete any subcategories belonging to this category
    await this.subCategoryModel.updateMany(
      { categoryId: id, deleted_at: null },
      { $set: { deleted_at: new Date() } },
    );

    const result = await this.categoryRepository.delete({ id });
    if (!result) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return { deleted: true };
  }

  async getCategoriesWithSubCategories(): Promise<any[]> {
    return this.categoryModel.aggregate([
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
