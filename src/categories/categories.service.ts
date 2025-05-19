import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const createdCategory = new this.categoryModel(createCategoryDto);
    return createdCategory.save();
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  
  async findOne(id: string): Promise<Category> {
    
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Category with ID '${id}' is not a valid ObjectId`);
    }

    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }


  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      updateCategoryDto,
      { new: true },
    ).exec();

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return updatedCategory;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return { deleted: true };
  }
  
  async getCategoriesWithSubCategories() {
    return this.categoryModel.aggregate([
      {
        $lookup: {
          from: 'subcategories',
          let: { category_id: '$_id' }, // _id est un ObjectId
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toObjectId: '$categoryId' }, // string → ObjectId
                    '$$category_id'
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
