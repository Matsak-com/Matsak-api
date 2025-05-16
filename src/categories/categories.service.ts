import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const createdCategory =
      await this.categoryRepository.create(createCategoryDto);
    return createdCategory;
  }

  async findAll(): Promise<Category[]> {
    const results = await this.categoryRepository.findAll();
    return results;
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const updatedCategory = await this.categoryRepository.update(
      id,
      updateCategoryDto,
    );

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

  // async findAllWithSubCategories(): Promise<Category[]> {
  //   // Suppose que subCategories est une référence => on utilise `.populate()`
  //   const results = await this.categoryModel.find().populate('subCategories').exec();
  // }
}
