import { CategoryRepository } from './../categories/categories.repository';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ERRORS } from 'src/common/errors';
import { SubCategory } from './sub-category.schema';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { SubCategoryRepository } from './sub-categories.repository';
import { Types } from 'mongoose';
import { AwsS3Service } from '../aws/aws-s3.service';

@Injectable()
export class SubCategoriesService {
  constructor(
    private readonly subCategoryRepo: SubCategoryRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async create(
    createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategory> {
    const { imageUrl, ...subCategoryData } = createSubCategoryDto;

    // Vérifie que la catégorie existe
    const category = await this.categoryRepo.findById({
      id: subCategoryData.categoryId.toString(),
    });
    if (!category) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }

    // Handle parent-child relationship if parentId is provided
    let level = 0;
    let ancestors: Types.ObjectId[] = [];

    if (subCategoryData.parentId) {
      const parent = await this.subCategoryRepo.findById({
        id: subCategoryData.parentId.toString(),
      });

      if (!parent) {
        throw new NotFoundException('Parent subcategory not found');
      }

      // Verify parent belongs to the same category
      if (
        parent.categoryId.toString() !== subCategoryData.categoryId.toString()
      ) {
        throw new BadRequestException(
          'Parent subcategory must belong to the same category',
        );
      }

      level = parent.level + 1;
      ancestors = [...(parent.ancestors || []), (parent as any)._id];
    }

    const created = await this.subCategoryRepo.create({
      doc: {
        ...subCategoryData,
        level,
        ancestors,
        children: [],
      },
      options: { save: false },
    });

    // Handle image upload
    let uploadedImageUrl = null;
    if (imageUrl) {
      uploadedImageUrl = (
        await this.awsS3Service.uploadFile({
          file: imageUrl,
          fileKey: `subcategories/${created._id}/image`,
        })
      ).fileKey;
    }

    created.imageUrl = uploadedImageUrl;
    await created.save();

    // Update parent's children array if parentId exists
    if (subCategoryData.parentId) {
      await this.subCategoryRepo.update({
        id: subCategoryData.parentId.toString(),
        update: {
          $push: { children: (created as any)._id },
        },
      });
    }

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
    const { imageUrl, ...subCategoryData } = updateDto;

    let uploadedImageUrl = undefined;
    if (imageUrl) {
      // Upload new image file
      uploadedImageUrl = (
        await this.awsS3Service.uploadFile({
          file: imageUrl,
          fileKey: `subcategories/${id}/image`,
        })
      ).fileKey;
    }

    const updateData = {
      ...subCategoryData,
      ...(uploadedImageUrl !== undefined && { imageUrl: uploadedImageUrl }),
    };

    const updated = await this.subCategoryRepo.update({
      id,
      update: updateData,
      options: {
        populate: [{ path: 'categoryId' }],
      },
    });

    if (!updated) {
      throw new NotFoundException(ERRORS.SUBCATEGORY_NOT_FOUND);
    }
    return updated;
  }

  async remove(
    id: string,
  ): Promise<{ deleted: boolean; childrenDeleted: number }> {
    const subCategory = await this.findOne(id);

    // Cascade delete all descendants (children, grandchildren, etc.)
    const childrenDeleted = await this.cascadeDeleteDescendants(id);

    // Remove from parent's children array if it has a parent
    if (subCategory.parentId) {
      await this.subCategoryRepo.update({
        id: subCategory.parentId.toString(),
        update: {
          $pull: { children: (subCategory as any)._id },
        },
      });
    }

    // Delete the subcategory itself
    const result = await this.subCategoryRepo.delete({ id });
    if (!result) {
      throw new NotFoundException(ERRORS.SUBCATEGORY_NOT_FOUND);
    }

    return {
      deleted: true,
      childrenDeleted,
    };
  }

  /**
   * Recursively cascade delete all descendants of a subcategory
   * @param parentId - ID of the parent subcategory
   * @returns Number of descendants deleted
   */
  private async cascadeDeleteDescendants(parentId: string): Promise<number> {
    // Find all direct children
    const children = await this.subCategoryRepo.findAll({
      filter: { parentId: parentId },
    });

    let totalDeleted = 0;

    // Recursively delete each child and its descendants
    for (const child of children) {
      const childId = (child as any)._id.toString();

      // Recursively delete grandchildren first
      const grandchildrenDeleted = await this.cascadeDeleteDescendants(childId);
      totalDeleted += grandchildrenDeleted;

      // Delete the child
      await this.subCategoryRepo.delete({ id: childId });
      totalDeleted++;
    }

    return totalDeleted;
  }

  async findByCategory(categoryId: string): Promise<SubCategory[]> {
    // Récupère les sous-catégories associées
    const results = await this.subCategoryRepo.findAll({
      filter: { categoryId },
      options: { populate: [{ path: 'categoryId' }] },
    });
    return results;
  }

  /**
   * Get tree structure for a category (only root subcategories with their children)
   */
  async getCategoryTree(categoryId: string): Promise<SubCategory[]> {
    // Get all subcategories for the category
    const allSubCategories = await this.subCategoryRepo.findAll({
      filter: { categoryId },
      options: {
        populate: [
          { path: 'categoryId' },
          {
            path: 'children',
            populate: {
              path: 'children',
              populate: { path: 'children' },
            },
          },
        ],
      },
    });

    // Return only root level (parentId is null)
    return allSubCategories.filter((sub) => !sub.parentId);
  }

  /**
   * Get all children of a subcategory (recursive)
   */
  async getChildren(subCategoryId: string): Promise<SubCategory[]> {
    const subCategory = await this.findOne(subCategoryId);

    const children = await this.subCategoryRepo.findAll({
      filter: { parentId: (subCategory as any)._id },
      options: {
        populate: [{ path: 'categoryId' }, { path: 'children' }],
      },
    });

    return children;
  }

  /**
   * Get all descendants of a subcategory (all levels)
   */
  async getDescendants(subCategoryId: string): Promise<SubCategory[]> {
    const subCategory = await this.findOne(subCategoryId);

    const descendants = await this.subCategoryRepo.findAll({
      filter: { ancestors: (subCategory as any)._id },
      options: {
        populate: [{ path: 'categoryId' }],
      },
    });

    return descendants;
  }

  /**
   * Get all ancestors of a subcategory
   */
  async getAncestors(subCategoryId: string): Promise<SubCategory[]> {
    const subCategory = await this.findOne(subCategoryId);

    if (!subCategory.ancestors || subCategory.ancestors.length === 0) {
      return [];
    }

    const ancestors = await this.subCategoryRepo.findAll({
      filter: { _id: { $in: subCategory.ancestors } },
      options: {
        populate: [{ path: 'categoryId' }],
      },
    });

    return ancestors;
  }

  /**
   * Move a subcategory to a new parent
   */
  async moveSubCategory(
    subCategoryId: string,
    newParentId: string | null,
  ): Promise<SubCategory> {
    const subCategory = await this.findOne(subCategoryId);

    // Remove from old parent's children
    if (subCategory.parentId) {
      await this.subCategoryRepo.update({
        id: subCategory.parentId.toString(),
        update: {
          $pull: { children: (subCategory as any)._id },
        },
      });
    }

    let level = 0;
    let ancestors: Types.ObjectId[] = [];

    // Add to new parent
    if (newParentId) {
      const newParent = await this.findOne(newParentId);

      // Prevent moving to its own descendant
      const isDescendant = await this.isDescendant(subCategoryId, newParentId);
      if (isDescendant) {
        throw new BadRequestException(
          'Cannot move a subcategory to its own descendant',
        );
      }

      level = newParent.level + 1;
      ancestors = [...(newParent.ancestors || []), (newParent as any)._id];

      // Add to new parent's children
      await this.subCategoryRepo.update({
        id: newParentId,
        update: {
          $push: { children: (subCategory as any)._id },
        },
      });
    }

    // Update the subcategory and all its descendants
    const updated = await this.subCategoryRepo.update({
      id: subCategoryId,
      update: {
        parentId: newParentId ? new Types.ObjectId(newParentId) : null,
        level,
        ancestors,
      },
    });

    // Update all descendants' ancestors and levels
    await this.updateDescendantsHierarchy(subCategoryId);

    return updated;
  }

  /**
   * Check if a subcategory is a descendant of another
   */
  private async isDescendant(
    subCategoryId: string,
    potentialAncestorId: string,
  ): Promise<boolean> {
    const descendants = await this.getDescendants(potentialAncestorId);
    return descendants.some(
      (desc) => (desc as any)._id.toString() === subCategoryId,
    );
  }

  /**
   * Update all descendants' hierarchy after moving a parent
   */
  private async updateDescendantsHierarchy(
    subCategoryId: string,
  ): Promise<void> {
    const parent = await this.findOne(subCategoryId);
    const children = await this.getChildren(subCategoryId);

    for (const child of children) {
      const newLevel = parent.level + 1;
      const newAncestors = [...(parent.ancestors || []), (parent as any)._id];

      await this.subCategoryRepo.update({
        id: (child as any)._id.toString(),
        update: {
          level: newLevel,
          ancestors: newAncestors,
        },
      });

      // Recursively update grandchildren
      await this.updateDescendantsHierarchy((child as any)._id.toString());
    }
  }
}
