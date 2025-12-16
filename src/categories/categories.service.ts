import { Injectable, NotFoundException } from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { Types } from 'mongoose';
import { Category } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './categories.repository';
import { SubCategoryRepository } from '../sub-categories/sub-categories.repository';
import {
  saveFileAsBase64,
  deleteLocalFile,
} from '../helpers/file-storage.helper';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly subCategoryRepository: SubCategoryRepository,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { imageUrl, ...categoryData } = createCategoryDto;

    // If name is not provided, use the first available translation
    if (!categoryData.name && categoryData.translations?.name) {
      const translations = categoryData.translations.name;
      categoryData.name =
        translations.en ||
        translations.fr ||
        translations.ar ||
        translations.zh ||
        'Unnamed Category';
    }

    // Validate that we have at least a name
    if (!categoryData.name) {
      throw new Error('Category must have a name or translations');
    }

    const category = await this.categoryRepository.create({
      doc: categoryData,
      options: { save: false },
    });

    let imageBase64 = null;
    if (imageUrl) {
      // Save file locally and convert to base64
      const imageResult = await saveFileAsBase64(
        imageUrl,
        'uploads/categories',
        `category-${category._id}`,
      );
      imageBase64 = imageResult.base64; // Store base64 data URI
    }

    category.imageUrl = imageBase64;
    await category.save();

    return category;
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async findOne(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }

    const category = await this.categoryRepository.findById({ id });
    if (!category) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const { imageUrl, ...categoryData } = updateCategoryDto;

    let imageBase64 = undefined;
    if (imageUrl) {
      // Get existing category to potentially delete old image
      const existingCategory = await this.categoryRepository.findById({ id });
      if (
        existingCategory?.imageUrl &&
        existingCategory.imageUrl.startsWith('uploads/')
      ) {
        // Delete old local file if it exists
        deleteLocalFile(existingCategory.imageUrl);
      }

      // Save new file locally and convert to base64
      const imageResult = await saveFileAsBase64(
        imageUrl,
        'uploads/categories',
        `category-${id}`,
      );
      imageBase64 = imageResult.base64;
    }

    const updateData = {
      ...categoryData,
      ...(imageBase64 !== undefined && { imageUrl: imageBase64 }),
    };

    const updatedCategory = await this.categoryRepository.update({
      id,
      update: updateData,
    });
    if (!updatedCategory) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }
    return updatedCategory;
  }

  async remove(
    id: string,
  ): Promise<{ deleted: boolean; subcategoriesDeleted: number }> {
    // Verify category exists
    const category = await this.categoryRepository.findById({ id });
    if (!category) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }

    // Soft-delete all subcategories belonging to this category (entire tree)
    // This includes all levels: root subcategories and all their nested children
    const deleteResult =
      await this.subCategoryRepository.softDeleteByCategory(id);
    const subcategoriesDeleted = deleteResult.modifiedCount || 0;

    // Delete the category itself
    const result = await this.categoryRepository.delete({ id });
    if (!result) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }

    return {
      deleted: true,
      subcategoriesDeleted,
    };
  }

  async getCategoriesWithSubCategories(): Promise<any[]> {
    return this.categoryRepository.getCategoriesWithSubCategories();
  }

  /**
   * Get all categories with their complete subcategory trees
   */
  async getCategoriesTree(): Promise<any[]> {
    const categories = await this.categoryRepository.findAll();

    const categoriesWithTrees = await Promise.all(
      categories.map(async (category) => {
        const categoryObj = category.toObject();
        const subCategoryTree = await this.buildSubCategoryTree(
          (category as any)._id.toString(),
        );
        return {
          ...categoryObj,
          subCategories: subCategoryTree,
        };
      }),
    );

    return categoriesWithTrees;
  }

  /**
   * Get a single category with its complete subcategory tree
   */
  async getCategoryTree(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }

    const category = await this.categoryRepository.findById({ id });
    if (!category) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }

    const categoryObj = category.toObject();
    const subCategoryTree = await this.buildSubCategoryTree(id);

    return {
      ...categoryObj,
      subCategories: subCategoryTree,
    };
  }

  /**
   * Build the subcategory tree for a given category efficiently
   * Fetches all subcategories in one query and builds the tree in memory
   */
  private async buildSubCategoryTree(categoryId: string): Promise<any[]> {
    // Fetch all subcategories for this category in a single query
    const allSubCategories = await this.subCategoryRepository.findAll({
      filter: { categoryId: new Types.ObjectId(categoryId) },
    });

    if (allSubCategories.length === 0) {
      return [];
    }

    // Convert to plain objects and create a map for quick lookup
    const subCategoryMap = new Map<string, any>();
    const rootSubCategories: any[] = [];

    // First pass: convert to objects and organize by ID
    for (const subCategory of allSubCategories) {
      const subCategoryObj = subCategory.toObject();
      subCategoryObj.children = []; // Initialize children array
      subCategoryMap.set((subCategory as any)._id.toString(), subCategoryObj);
    }

    // Second pass: build the tree structure
    for (const subCategory of allSubCategories) {
      const subCategoryId = (subCategory as any)._id.toString();
      const subCategoryObj = subCategoryMap.get(subCategoryId);

      if (!subCategory.parentId) {
        // This is a root level subcategory
        rootSubCategories.push(subCategoryObj);
      } else {
        // This is a child, add it to its parent's children array
        const parentId = subCategory.parentId.toString();
        const parent = subCategoryMap.get(parentId);
        if (parent) {
          parent.children.push(subCategoryObj);
        }
      }
    }

    return rootSubCategories;
  }
}
