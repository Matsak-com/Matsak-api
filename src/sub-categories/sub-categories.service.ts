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
import {
  saveFileAsBase64,
  deleteLocalFile,
} from '../helpers/file-storage.helper';

@Injectable()
export class SubCategoriesService {
  constructor(
    private readonly subCategoryRepo: SubCategoryRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  async create(
    createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategory> {
    const { imageUrl, ...subCategoryData } = createSubCategoryDto;

    // If name is not provided, use the first available translation
    if (!subCategoryData.name && subCategoryData.translations?.name) {
      const translations = subCategoryData.translations.name;
      subCategoryData.name =
        translations.en ||
        translations.fr ||
        translations.ar ||
        translations.zh ||
        'Unnamed Subcategory';
    }

    // Validate that we have at least a name
    if (!subCategoryData.name) {
      throw new BadRequestException(
        'Subcategory must have a name or translations',
      );
    }

    // Handle parent-child relationship if parentId is provided
    let level = 0;
    let ancestors: Types.ObjectId[] = [];
    let categoryId = subCategoryData.categoryId
      ? new Types.ObjectId(subCategoryData.categoryId)
      : null;

    if (subCategoryData.parentId) {
      const parent = await this.subCategoryRepo.findById({
        id: subCategoryData.parentId.toString(),
      });

      if (!parent) {
        throw new NotFoundException('Parent subcategory not found');
      }

      // If categoryId is not provided, infer it from the parent
      if (!categoryId) {
        categoryId = parent.categoryId;
      } else {
        // Verify parent belongs to the same category if categoryId is provided
        if (parent.categoryId.toString() !== categoryId.toString()) {
          throw new BadRequestException(
            'Parent subcategory must belong to the same category',
          );
        }
      }

      level = parent.level + 1;
      ancestors = [...(parent.ancestors || []), (parent as any)._id];
    }

    // Verify categoryId is set (either provided or inferred from parent)
    if (!categoryId) {
      throw new BadRequestException(
        'categoryId must be provided when creating a root subcategory',
      );
    }

    // Vérifie que la catégorie existe
    const category = await this.categoryRepo.findById({
      id: categoryId.toString(),
    });
    if (!category) {
      throw new NotFoundException(ERRORS.CATEGORY_NOT_FOUND);
    }

    const created = await this.subCategoryRepo.create({
      doc: {
        ...subCategoryData,
        categoryId,
        level,
        ancestors,
        children: [],
      },
      options: { save: false },
    });

    // Handle image upload - save locally and convert to base64
    let imageBase64 = null;
    if (imageUrl) {
      const imageResult = await saveFileAsBase64(
        imageUrl,
        'uploads/subcategories',
        `subcategory-${created._id}`,
      );
      imageBase64 = imageResult.base64;
    }

    created.imageUrl = imageBase64;
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

    let imageBase64 = undefined;
    if (imageUrl) {
      // Get existing subcategory to potentially delete old image
      const existingSubCategory = await this.subCategoryRepo.findById({ id });
      if (
        existingSubCategory?.imageUrl &&
        existingSubCategory.imageUrl.startsWith('uploads/')
      ) {
        // Delete old local file if it exists
        deleteLocalFile(existingSubCategory.imageUrl);
      }

      // Save new file locally and convert to base64
      const imageResult = await saveFileAsBase64(
        imageUrl,
        'uploads/subcategories',
        `subcategory-${id}`,
      );
      imageBase64 = imageResult.base64;
    }

    // Convert parentId and categoryId to ObjectId if provided
    const updateData: any = {
      ...subCategoryData,
      ...(imageBase64 !== undefined && { imageUrl: imageBase64 }),
    };

    // Handle parentId: convert to ObjectId if valid string, convert "null" string or null to null
    if (updateData.parentId !== undefined) {
      if (
        updateData.parentId === null ||
        updateData.parentId === 'null' ||
        updateData.parentId === ''
      ) {
        updateData.parentId = null;
      } else {
        updateData.parentId = new Types.ObjectId(updateData.parentId);
      }
    }

    if (updateData.categoryId) {
      updateData.categoryId = new Types.ObjectId(updateData.categoryId);
    }

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

    // Cascade delete all descendants in a single bulk operation using ancestors array
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
   * Cascade delete all descendants of a subcategory using bulk operation
   * @param parentId - ID of the parent subcategory
   * @returns Number of descendants deleted
   */
  private async cascadeDeleteDescendants(parentId: string): Promise<number> {
    const parentObjectId = new Types.ObjectId(parentId);
    
    // Delete all descendants in a single bulk operation using the ancestors array
    // This is much more efficient than recursive N+1 queries
    const result = await this.subCategoryRepo.deleteMany({
      ancestors: parentObjectId,
    });

    return result.deletedCount;
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
   * Update all descendants' hierarchy after moving a parent using bulk operations
   * This is much more efficient than N+1 recursive queries
   */
  private async updateDescendantsHierarchy(
    subCategoryId: string,
  ): Promise<void> {
    // Fetch the parent node
    const parent = await this.findOne(subCategoryId);

    // Fetch all descendants
    const descendants = await this.getDescendants(subCategoryId);
    if (!descendants || descendants.length === 0) {
      return;
    }

    // Map of id to node for quick lookup
    const idToNode = new Map<string, any>();
    idToNode.set((parent as any)._id.toString(), parent);
    for (const node of descendants) {
      idToNode.set((node as any)._id.toString(), node);
    }

    // Prepare bulk operations
    const bulkOps = [];
    for (const descendant of descendants) {
      // Recalculate ancestors and level
      // Walk up the tree to build ancestors
      const ancestors = [];
      let current = descendant;
      while (current.parentId) {
        const parentNode = idToNode.get(current.parentId.toString());
        if (!parentNode) break;
        ancestors.unshift((parentNode as any)._id);
        current = parentNode;
      }
      const level = ancestors.length;

      bulkOps.push({
        updateOne: {
          filter: { _id: (descendant as any)._id },
          update: {
            $set: {
              ancestors,
              level,
            },
          },
        },
      });
    }

    if (bulkOps.length > 0) {
      await this.subCategoryRepo.bulkWrite(bulkOps);
    }
  }
}
