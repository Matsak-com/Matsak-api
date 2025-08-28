import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Category } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './categories.repository';
import { SubCategoryRepository } from '../sub-categories/sub-categories.repository';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly subCategoryRepository: SubCategoryRepository,
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

    const category = await this.categoryRepository.findById({ id });
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
    await this.subCategoryRepository.softDeleteByCategory(id);

    const result = await this.categoryRepository.delete({ id });
    if (!result) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return { deleted: true };
  }

  async getCategoriesWithSubCategories(): Promise<any[]> {
    return this.categoryRepository.getCategoriesWithSubCategories();
  }
}
