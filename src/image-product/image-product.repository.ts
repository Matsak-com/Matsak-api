import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, QueryOptions, UpdateQuery } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { ImageProduct, ImageProductDocument } from './image-product.schema';

// 🔧 Types pour les paramètres avec structure doc/options
export interface CreateImageParams {
  doc: {
    mimeType: string;
    data: string;
    altText: string;
    name: string;
  };
  options?: QueryOptions;
}

export interface FindAllParams {
  filter?: FilterQuery<ImageProductDocument>;
  options?: QueryOptions;
}

export interface FindByIdParams {
  id: string;
  options?: QueryOptions;
}

export interface UpdateParams {
  id: string;
  doc: Partial<ImageProduct>;
  options?: QueryOptions;
}

export interface DeleteParams {
  id: string;
  options?: QueryOptions;
}

@Injectable()
export class ImageProductRepository extends BaseRepository<ImageProductDocument> {
  constructor(
    @InjectModel(ImageProduct.name)
    imageProductModel: Model<ImageProductDocument>,
  ) {
    super(imageProductModel);
  }

  // 🆕 Méthodes avec structure { doc, options }

  /**
   * Create image with doc/options structure
   */
  async createWithOptions({
    doc,
    options = {},
  }: CreateImageParams): Promise<ImageProductDocument> {
    try {
      const imageProduct = new this.model({
        mimeType: doc.mimeType,
        data: doc.data,
        altText: doc.altText,
        name: doc.name,
      });

      return await imageProduct.save(options);
    } catch (error) {
      console.error('Error creating image:', error);
      throw error;
    }
  }

  /**
   * Find all images with filter/options structure
   */
  async findAllWithOptions({
    filter = {},
    options = {},
  }: FindAllParams = {}): Promise<ImageProductDocument[]> {
    try {
      // Exclure les éléments soft-deleted par défaut
      const finalFilter = {
        deleted_at: { $exists: false },
        ...filter,
      };

      return await this.model.find(finalFilter, null, options).exec();
    } catch (error) {
      console.error('Error finding all images:', error);
      throw error;
    }
  }

  /**
   * Find by ID with options structure
   */
  async findByIdWithOptions({
    id,
    options = {},
  }: FindByIdParams): Promise<ImageProductDocument | null> {
    try {
      const filter = {
        _id: id,
        deleted_at: { $exists: false },
      };

      return await this.model.findOne(filter, null, options).exec();
    } catch (error) {
      console.error(`Error finding image by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update image with doc/options structure
   */
  async updateWithOptions({
    id,
    doc,
    options = {},
  }: UpdateParams): Promise<ImageProductDocument | null> {
    try {
      const filter = {
        _id: id,
        deleted_at: { $exists: false },
      };

      const updateOptions = {
        new: true, // Return updated document
        runValidators: true,
        ...options,
      };

      return await this.model
        .findOneAndUpdate(
          filter,
          doc as UpdateQuery<ImageProductDocument>,
          updateOptions,
        )
        .exec();
    } catch (error) {
      console.error(`Error updating image ${id}:`, error);
      throw error;
    }
  }

  /**
   * Soft delete image with options structure
   */
  async deleteWithOptions({
    id,
    options = {},
  }: DeleteParams): Promise<ImageProductDocument | null> {
    try {
      const filter = {
        _id: id,
        deleted_at: { $exists: false },
      };

      const updateOptions = {
        new: true,
        ...options,
      };

      // Soft delete: set deleted_at timestamp
      return await this.model
        .findOneAndUpdate(filter, { deleted_at: new Date() }, updateOptions)
        .exec();
    } catch (error) {
      console.error(`Error deleting image ${id}:`, error);
      throw error;
    }
  }

  // Note: Do not override BaseRepository methods here. Use the helper
  // methods below (createWithOptions, findAllWithOptions, etc.) from
  // other services to keep signatures consistent with BaseRepository.

  // 🆕 Additional utility methods

  /**
   * Find images by criteria with pagination
   */
  async findWithPagination({
    filter = {},
    options = {},
    page = 1,
    limit = 10,
  }: FindAllParams & { page?: number; limit?: number } = {}) {
    try {
      const skip = (page - 1) * limit;
      const finalFilter = {
        deleted_at: { $exists: false },
        ...filter,
      };

      const [data, total] = await Promise.all([
        this.model.find(finalFilter, null, { ...options, skip, limit }).exec(),
        this.model.countDocuments(finalFilter).exec(),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in paginated find:', error);
      throw error;
    }
  }

  /**
   * Find images by mimetype
   */
  async findByMimeType({
    mimeType,
    options = {},
  }: {
    mimeType: string;
    options?: QueryOptions;
  }): Promise<ImageProductDocument[]> {
    return this.findAllWithOptions({
      filter: { mimeType },
      options,
    });
  }

  /**
   * Restore soft-deleted image
   */
  async restore({
    id,
    options = {},
  }: {
    id: string;
    options?: QueryOptions;
  }): Promise<ImageProductDocument | null> {
    try {
      return await this.model
        .findOneAndUpdate(
          { _id: id, deleted_at: { $exists: true } },
          { $unset: { deleted_at: 1 } },
          { new: true, ...options },
        )
        .exec();
    } catch (error) {
      console.error(`Error restoring image ${id}:`, error);
      throw error;
    }
  }
}
