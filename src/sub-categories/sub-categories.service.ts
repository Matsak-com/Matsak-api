import { CategoryRepository } from './../categories/categories.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ERRORS } from 'src/common/errors';
import { SubCategory } from './sub-category.schema';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { SubCategoryRepository } from './sub-categories.repository';

@Injectable()
export class SubCategoriesService {
  constructor(
    private readonly subCategoryRepo: SubCategoryRepository,

    private readonly categoryRepo: CategoryRepository,
  ) {}

  async create(
    createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategory> {
    // Vérifie que la catégorie existe
    const category = await this.categoryRepo.findById({
      id: createSubCategoryDto.categoryId.toString(),
    });
    if (!category) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }

    const created = await this.subCategoryRepo.create({
      doc: createSubCategoryDto,
    });
    return created;
  }

  /**
   * Retrieves all subcategories from the repository.
   *
   * @returns {Promise<SubCategory[]>} A promise that resolves to an array of SubCategory entities.
   * @remarks
   * This method populates the `categoryId` field for each subcategory.
   */
  async findAll(): Promise<SubCategory[]> {
    const results = await this.subCategoryRepo.findAll({
      filter: {},
      options: {
        populate: [{ path: 'categoryId' }],
      },
    });
    return results;
  }

  async findOne(id: string): Promise<SubCategory> {
    const subCategory = await this.subCategoryRepo.findById({
      id,
      options: {
        populate: [{ path: 'categoryId' }],
      },
    });
    if (!subCategory) {
      throw new NotFoundException(ERRORS.SUBCATEGORY_NOT_FOUND);
    }
    return subCategory;
  }

  async update(
    id: string,
    updateDto: UpdateSubCategoryDto,
  ): Promise<SubCategory> {
    const updated = await this.subCategoryRepo.update({
      id,
      update: updateDto,
      options: {
        populate: [{ path: 'categoryId' }],
      },
    });

    if (!updated) {
      throw new NotFoundException(ERRORS.SUBCATEGORY_NOT_FOUND);
    }
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.subCategoryRepo.delete({ id });
    if (!result) {
      throw new NotFoundException(ERRORS.SUBCATEGORY_NOT_FOUND);
    }
    return { deleted: true };
  }

  async findByCategory(categoryId: string): Promise<SubCategory[]> {
    // Récupère les sous-catégories associées
    const results = await this.subCategoryRepo.findAll({
      filter: { categoryId },
      options: { populate: [{ path: 'categoryId' }] },
    });
    return results;
  }
}
