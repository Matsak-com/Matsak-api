import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoryRepository.create(createCategoryDto);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  
  async findOne(id: string): Promise<Category> {
<<<<<<< HEAD
    const category = await this.categoryRepository.findById(id);
=======
    
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Category with ID '${id}' is not a valid ObjectId`);
    }

    const category = await this.categoryModel.findById(id).exec();
>>>>>>> 7745e39a26d7746d88cc29acb2cc33af319f7b26
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }


  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const updatedCategory = await this.categoryRepository.update(id, updateCategoryDto);
    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return updatedCategory;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.categoryRepository.delete(id);
    if (!result) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return { deleted: true };
  }
<<<<<<< HEAD

  async getCategoriesWithSubCategories(): Promise<any[]> {
=======
  
  async getCategoriesWithSubCategories() {
>>>>>>> 7745e39a26d7746d88cc29acb2cc33af319f7b26
    return this.categoryModel.aggregate([
      {
        $lookup: {
          from: 'subcategories',
<<<<<<< HEAD
          let: { category_id: '$_id' },
=======
          let: { category_id: '$_id' }, // _id est un ObjectId
>>>>>>> 7745e39a26d7746d88cc29acb2cc33af319f7b26
          pipeline: [
            {
              $match: {
                $expr: {
<<<<<<< HEAD
                  $eq: [{ $toObjectId: '$categoryId' }, '$$category_id'],
=======
                  $eq: [
                    { $toObjectId: '$categoryId' }, // string → ObjectId
                    '$$category_id'
                  ],
>>>>>>> 7745e39a26d7746d88cc29acb2cc33af319f7b26
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
