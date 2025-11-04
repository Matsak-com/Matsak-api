import { Injectable, NotFoundException } from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { Types } from 'mongoose';
import { Category } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './categories.repository';
import { SubCategoryRepository } from '../sub-categories/sub-categories.repository';
import { AwsS3Service } from '../aws/aws-s3.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly subCategoryRepository: SubCategoryRepository,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { imageUrl, ...categoryData } = createCategoryDto;
    
    const category = await this.categoryRepository.create({
      doc: categoryData,
      options: { save: false },
    });

    let uploadedImageUrl = null;
    if (imageUrl) {
      uploadedImageUrl = (
        await this.awsS3Service.uploadFile({
          file: imageUrl,
          fileKey: `categories/${category._id}/image`,
        })
      ).fileKey;
    }

    category.imageUrl = uploadedImageUrl;
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

    let uploadedImageUrl = undefined;
    if (imageUrl) {
      // Upload new image file
      uploadedImageUrl = (
        await this.awsS3Service.uploadFile({
          file: imageUrl,
          fileKey: `categories/${id}/image`,
        })
      ).fileKey;
    }

    const updateData = {
      ...categoryData,
      ...(uploadedImageUrl !== undefined && { imageUrl: uploadedImageUrl }),
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
    
    // For each category, build its subcategory tree
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
   * Recursively build the subcategory tree for a given category
   */
  private async buildSubCategoryTree(
    categoryId: string,
    parentId: string | null = null,
  ): Promise<any[]> {
    // Find all subcategories for this category and parent level
    const subCategories = await this.subCategoryRepository.findAll({
      filter: {
        categoryId: categoryId,
        parentId: parentId || null,
      },
    });

    // For each subcategory, recursively get its children
    const subCategoriesWithChildren = await Promise.all(
      subCategories.map(async (subCategory) => {
        const subCategoryObj = subCategory.toObject();
        const children = await this.buildSubCategoryTree(
          categoryId,
          (subCategory as any)._id.toString(),
        );
        return {
          ...subCategoryObj,
          children,
        };
      }),
    );

    return subCategoriesWithChildren;
  }
}
