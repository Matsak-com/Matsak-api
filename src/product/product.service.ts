import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { Product } from './product.schema';
import { ProductRepository } from './product.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { FilterQuery, Types } from 'mongoose';
import { ImageProductService } from '../image-product/image-product.service';
import { DetailProductService } from '../detail-product/detail-product.service';
import { DetailProduct } from '../detail-product/detail-product.schema';
import { SearchService } from '../elasticsearch/elasticsearch.service';
import { UpdateProductDto } from './dto/update-product.dto';

import { z } from 'zod';
import { createProductSchema } from '../common/schemas/product.schemas';

type ValidatedCreateProductDto = z.infer<typeof createProductSchema>;

@Injectable()
export class ProductService implements OnModuleInit {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly productRepo: ProductRepository,
    private readonly detailRepo: DetailProductRepository,
    private readonly imageservice: ImageProductService,
    private readonly detailProductService: DetailProductService,
    private readonly searchService: SearchService,
  ) {}

  async onModuleInit() {
    this.logger.log('ProductService initialized');
  }

  async createProduct(
    createDto: ValidatedCreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    let detailId: string | null = null;
    let productId: string | null = null;
    const uploadedImageIds: Types.ObjectId[] = [];

    try {
      // Step 1: Create detail
      const detail = (await this.detailProductService.create(
        createDto.detailData,
      )) as DetailProduct & { _id: string };
      detailId = detail._id;

      const productDoc: any = {
        detail: detail._id,
        team: new Types.ObjectId(createDto.teamId),
        images: [],
        basePrice: createDto.basePrice ?? createDto.price ?? 0,
        currency: createDto.currency || 'MGA',
        discounts: createDto.discounts
          ? createDto.discounts.map((d) => ({
              ...d,
              startDate: d.startDate ? new Date(d.startDate) : undefined,
              endDate: d.endDate ? new Date(d.endDate) : undefined,
            }))
          : [],
        isPublished: createDto.isPublished !== undefined ? createDto.isPublished : false, // Default to unpublished
      };

      // Step 2: Create product
      const created = await this.productRepo.create({ doc: productDoc });
      productId = (created as any)._id.toString();

      // Step 3: Handle multiple image files with rollback on failure
      if (files && files.length > 0 && created) {
        try {
          for (const file of files) {
            const uploadedImage = await this.imageservice.upload({
              buffer: file.buffer,
              originalname: file.originalname,
              mimetype: file.mimetype,
            });
            uploadedImageIds.push(
              new Types.ObjectId(uploadedImage._id.toString()),
            );
          } // Update product with all image IDs
          await this.productRepo.update({
            id: productId,
            update: { images: uploadedImageIds },
          });
        } catch (imageError) {
          this.logger.error(
            'Image upload failed, rolling back product and detail',
            imageError,
          );

          // Rollback: Delete uploaded images
          for (const imageId of uploadedImageIds) {
            try {
              await this.imageservice.remove(imageId.toString());
            } catch (cleanupError) {
              this.logger.error(
                `Failed to cleanup image ${imageId}`,
                cleanupError,
              );
            }
          }

          // Rollback: Delete product
          if (productId) {
            try {
              await this.productRepo.delete({ id: productId });
            } catch (cleanupError) {
              this.logger.error(
                `Failed to cleanup product ${productId}`,
                cleanupError,
              );
            }
          }

          // Rollback: Delete detail
          if (detailId) {
            try {
              await this.detailProductService.remove(detailId);
            } catch (cleanupError) {
              this.logger.error(
                `Failed to cleanup detail ${detailId}`,
                cleanupError,
              );
            }
          }

          throw new BadRequestException(
            'Failed to upload images. Product creation rolled back.',
          );
        }
      }

      // Step 4: Fetch populated product
      const populated = await this.productRepo.findById({
        id: productId,
        options: {
          populate: [{ path: 'detail' }, { path: 'images' }, { path: 'team' }],
        },
      });

      // Step 5: seulement si publié
      if (populated && (populated as any).isPublished) {
        try {
          await this.searchService.indexProduct(populated as any);
        } catch (indexError) {
          this.logger.error('Failed to index product in Elasticsearch', indexError);
        }
      }

      return this.withReviewStats(populated as Product);
    } catch (error) {
      // Handle duplicate key errors
      if ((error as any).code === 11000) {
        throw new BadRequestException(ERRORS.PRODUCT_ALREADY_EXISTS);
      }
      this.logger.error('Error creating product', error);
      throw error;
    }
  }

  async findAll(): Promise<Product[]> {
    const products = await this.productRepo.findAll({
      filter: { 
        isPublished: true,
      },
      options: {
        populate: [{ path: 'detail' }, { path: 'images' }, { path: 'team' }],
      },
    });
    return products.map((product) => this.withReviewStats(product));
  }

  async findBy({
    filter,
    includeUnpublished = false,
  }: {
    filter: FilterQuery<Product>;
    includeUnpublished?: boolean;
  }): Promise<Product[]> {
    const baseFilter = includeUnpublished
      ? filter
      : { ...filter, isPublished: true };

    const products = await this.productRepo.findAll({
      filter: baseFilter,
      options: {
        populate: [{ path: 'detail' }, { path: 'images' }],
      },
    });
    return products.map((product) => this.withReviewStats(product));
  }

  async findOne(id: string, requester?: { teamId?: string; isAdmin?: boolean }): Promise<Product> {
    const product = await this.productRepo.findById({
      id,
      options: {
        populate: [{ path: 'detail' }, { path: 'images' }, { path: 'team' }],
      },
    });

    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    const productTeamId =
      (product.team as any)?._id?.toString?.() ?? (product.team as any)?.toString?.();
    const isOwner = !!requester?.teamId && productTeamId === requester.teamId;
    const isAdmin = !!requester?.isAdmin;

    // Bloque l'accès si non publié et pas vendeur/admin
    if (!(product as any).isPublished && !isOwner && !isAdmin) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    return this.withReviewStats(product);
  }

  private withReviewStats(product: Product | null): Product {
    if (!product) {
      return product as any;
    }

    const asObject = (product as any).toObject
      ? (product as any).toObject()
      : product;

    return {
      ...asObject,
      averageRating: asObject.averageRating ?? 0,
      reviewCount: asObject.reviewCount ?? 0,
    } as Product;
  }

  async search(keyword: string) {
    return this.searchService.searchProducts(keyword);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    const existingProduct = await this.productRepo.findById({ id });
    if (!existingProduct || existingProduct.deleted_at) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    if (updateProductDto.detailData) {
      await this.detailProductService.update(
        existingProduct.detail.toString(),
        updateProductDto.detailData,
      );
    }

    let imageIds = existingProduct.images || [];
    let shouldUpdateImages = false;
    const oldImageIds = existingProduct.images
      ? [...existingProduct.images]
      : [];
    const newlyUploadedImageIds: Types.ObjectId[] = [];
    const imagesToKeep: Types.ObjectId[] = [];

    // Handle existingImages - determine which images to keep
    if (
      updateProductDto.existingImages &&
      Array.isArray(updateProductDto.existingImages)
    ) {
      await existingProduct.populate('images');
      const populatedImages = existingProduct.images as any[];

      for (const existingImageName of updateProductDto.existingImages) {
        const matchingImage = populatedImages.find(
          (img) => img && img.name === existingImageName,
        );
        if (matchingImage && matchingImage._id) {
          imagesToKeep.push(new Types.ObjectId(matchingImage._id.toString()));
        }
      }
      this.logger.log(`Keeping ${imagesToKeep.length} existing images`);
    }

    if (files && files.length > 0) {
      try {
        for (const file of files) {
          const uploadedImage = await this.imageservice.upload({
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          });
          newlyUploadedImageIds.push(
            new Types.ObjectId(uploadedImage._id.toString()),
          );
        }

        const imagesToRemove = oldImageIds.filter(
          (imgId) =>
            !imagesToKeep.some(
              (keepId) => keepId.toString() === imgId.toString(),
            ),
        );

        if (imagesToRemove.length > 0) {
          this.logger.log(`Removing ${imagesToRemove.length} old images`);
          for (const imgId of imagesToRemove) {
            try {
              await this.imageservice.remove(imgId.toString());
            } catch (removeError) {
              this.logger.warn(
                `Failed to remove old image ${imgId}`,
                removeError,
              );
            }
          }
        }

        imageIds = [...imagesToKeep, ...newlyUploadedImageIds];
        shouldUpdateImages = true;
        this.logger.log(
          `Final image count: ${imageIds.length} (${imagesToKeep.length} kept + ${newlyUploadedImageIds.length} new)`,
        );
      } catch (uploadError) {
        this.logger.error('Image upload failed during update', uploadError);

        for (const imgId of newlyUploadedImageIds) {
          try {
            await this.imageservice.remove(imgId.toString());
          } catch (cleanupError) {
            this.logger.error(
              `Failed to cleanup uploaded image ${imgId}`,
              cleanupError,
            );
          }
        }

        throw new BadRequestException('Failed to upload images during update.');
      }
    } else if (
      updateProductDto.existingImages &&
      Array.isArray(updateProductDto.existingImages)
    ) {
      // Only existingImages provided (no new files) - keep only specified images
      const imagesToRemove = oldImageIds.filter(
        (imgId) =>
          !imagesToKeep.some(
            (keepId) => keepId.toString() === imgId.toString(),
          ),
      );

      if (imagesToRemove.length > 0) {
        this.logger.log(
          `Removing ${imagesToRemove.length} images not in existingImages list`,
        );
        for (const imgId of imagesToRemove) {
          try {
            await this.imageservice.remove(imgId.toString());
          } catch (removeError) {
            this.logger.warn(
              `Failed to remove old image ${imgId}`,
              removeError,
            );
          }
        }
      }

      imageIds = imagesToKeep;
      shouldUpdateImages = true;
    } else if (updateProductDto.imageData?.data) {
      // Convert base64 data to Buffer
      let buffer: Buffer;
      let mimeType = updateProductDto.imageData.mimeType || 'image/jpeg';

      try {
        // Handle data URL format (data:image/jpeg;base64,...)
        if (updateProductDto.imageData.data.startsWith('data:')) {
          const matches = updateProductDto.imageData.data.match(
            /^data:([^;]+);base64,(.+)$/,
          );
          if (matches) {
            mimeType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
          } else {
            throw new Error('Invalid data URL format');
          }
        } else {
          // Plain base64 string
          buffer = Buffer.from(updateProductDto.imageData.data, 'base64');
        }

        // Upload new image first
        const uploadedImage = await this.imageservice.upload({
          buffer,
          originalname: updateProductDto.imageData.name || 'uploaded-image.jpg',
          mimetype: mimeType,
        });

        const newImageId = new Types.ObjectId(uploadedImage._id.toString());

        // Only remove old images after successful upload
        if (oldImageIds.length > 0) {
          for (const imgId of oldImageIds) {
            try {
              await this.imageservice.remove(imgId.toString());
            } catch (removeError) {
              this.logger.warn(
                `Failed to remove old image ${imgId}`,
                removeError,
              );
            }
          }
        }

        imageIds = [newImageId];
        shouldUpdateImages = true;
      } catch (base64Error) {
        this.logger.error('Failed to upload base64 image', base64Error);
        throw new BadRequestException(
          'Failed to upload base64 image during update.',
        );
      }
    } else if (
      updateProductDto.imageData === null ||
      (updateProductDto.imageData && updateProductDto.imageData.data === null)
    ) {
      // Remove existing images if any
      if (existingProduct.images && existingProduct.images.length > 0) {
        for (const imgId of existingProduct.images) {
          await this.imageservice.remove(imgId.toString());
        }
      }
      imageIds = [];
      shouldUpdateImages = true;
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (typeof updateProductDto.isPublished !== 'undefined') {
      updateData.isPublished = updateProductDto.isPublished;
    }

    if (typeof updateProductDto.basePrice !== 'undefined') {
      updateData.basePrice = updateProductDto.basePrice;
    }

    // Handle price field (alias for basePrice)
    if (typeof updateProductDto.price !== 'undefined') {
      updateData.basePrice = updateProductDto.price;
    }

    if (updateProductDto.currency) {
      updateData.currency = updateProductDto.currency;
    }

    if (updateProductDto.teamId) {
      updateData.team = new Types.ObjectId(updateProductDto.teamId);
    }

    if (shouldUpdateImages) {
      updateData.images = imageIds;
    }

    // Handle discount data - prioritize new fields over existing discounts array
    if (updateProductDto.discountType !== undefined) {
      if (updateProductDto.discountType === 'no-discount') {
        // Clear discounts when explicitly set to no-discount
        updateData.discounts = [];
      } else {
        const discountValue = updateProductDto.discountValue || 0;
        if (discountValue > 0) {
          // Map discount types to valid enum values
          let mappedType = updateProductDto.discountType;
          if (updateProductDto.discountType === 'percent') {
            mappedType = 'percentage';
          } else if (
            !['percentage', 'fixed', 'bulk'].includes(
              updateProductDto.discountType,
            )
          ) {
            mappedType = 'fixed'; // Default fallback
          }

          updateData.discounts = [
            {
              type: mappedType,
              value: discountValue,
              isActive: true,
            },
          ];
        } else {
          // If discountValue is 0 or undefined, clear discounts
          updateData.discounts = [];
        }
      }
    } else if (updateProductDto.discounts) {
      // Fall back to existing discounts array structure if new fields not provided
      updateData.discounts = updateProductDto.discounts.map((d: any) => ({
        ...d,
        startDate: d.startDate ? new Date(d.startDate) : undefined,
        endDate: d.endDate ? new Date(d.endDate) : undefined,
      }));
    }

    // Appliquer la mise à jour
    const updatedProduct = await this.productRepo.update({
      id,
      update: updateData,
    });

    // Populate et retourner
    await updatedProduct.populate(['detail', 'images', 'team']);

    try {
      if ((updatedProduct as any).isPublished) {
        await this.searchService.indexProduct(updatedProduct as any);
      } else {
        await this.searchService.removeProduct(id); // retirer de l'index si dépublié
      }
    } catch (indexError) {
      this.logger.error(
        `Failed to sync Elasticsearch for product ${updatedProduct._id}: ${indexError?.message || indexError}`,
      );
    }

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.productRepo.findById({ id });
    if (!product || product.deleted_at) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Soft delete: marquer comme supprimé
    await this.productRepo.update({
      id,
      update: { deleted_at: new Date() },
    });

    // Supprimer de l'index Elasticsearch
    try {
      await this.searchService.removeProduct(id);
    } catch (error) {
      Logger.error(
        `Failed to remove product ${id} from Elasticsearch: ${error?.message || error}`,
      );
    }
  }

  // Pricing methods
  async setPrice(
    id: string,
    basePrice: number,
    currency = 'MGA',
  ): Promise<Product> {
      const product = await this.productRepo.findById({ id });
      if (!product) {
        throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
      }

      const updatedProduct = await this.productRepo.update({
        id,
        update: {
          basePrice,
          currency,
          updatedAt: new Date(),
        },
      });

      await updatedProduct.populate(['detail', 'images', 'team']);

      try {
        if ((updatedProduct as any).isPublished) {
          await this.searchService.indexProduct(updatedProduct as any);
        }
      } 
      catch (error) { 
        Logger.error(
          `Failed to index product ${id} after price update: ${error?.message || error}`,
        );
      }

      return updatedProduct;
    
  }

  async addDiscount(
    id: string,
    discountData: {
      type: 'percentage' | 'fixed' | 'bulk';
      value: number;
      description?: string;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
      minQuantity?: number;
    },
  ): Promise<Product> {
    const product = await this.productRepo.findById({ id });
    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    // Validate discount data
    if (discountData.type === 'percentage' && discountData.value > 100) {
      throw new BadRequestException(ERRORS.PERCENTAGE_DISCOUNT_EXCEEDS);
    }

    if (discountData.type === 'bulk' && !discountData.minQuantity) {
      throw new BadRequestException(ERRORS.BULK_DISCOUNT_MIN_QTY_REQUIRED);
    }

    const discount = {
      ...discountData,
      startDate: discountData.startDate
        ? new Date(discountData.startDate)
        : undefined,
      endDate: discountData.endDate
        ? new Date(discountData.endDate)
        : undefined,
      isActive: discountData.isActive ?? true,
    };

    const updatedProduct = await this.productRepo.update({
      id,
      update: {
        $push: { discounts: discount },
        updatedAt: new Date(),
      },
    });

    await updatedProduct.populate(['detail', 'images', 'team']);

    // Réindexer après ajout de discount
    try {
      if ((updatedProduct as any).isPublished)
      {await this.searchService.indexProduct(updatedProduct as any);}
    } catch (error) {
      Logger.error(
        `Failed to index product ${id} after price update: ${error?.message || error}`,
      );
    }

    return updatedProduct;
  }

  async removeDiscount(id: string, discountIndex: number): Promise<Product> {
    const product = await this.productRepo.findById({ id });
    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    if (
      !product.discounts ||
      discountIndex < 0 ||
      discountIndex >= product.discounts.length
    ) {
      throw new BadRequestException(ERRORS.INVALID_DISCOUNT_INDEX);
    }

    // Supprimer l'élément à l'index spécifié
    product.discounts.splice(discountIndex, 1);

    const updatedProduct = await this.productRepo.update({
      id,
      update: {
        discounts: product.discounts,
        updatedAt: new Date(),
      },
    });

    await updatedProduct.populate(['detail', 'images', 'team']);

    // Réindexer après suppression de discount
    try {
      if ((updatedProduct as any).isPublished)
      {await this.searchService.indexProduct(updatedProduct as any);}
    } catch (error) {
      Logger.error(
        `Failed to reindex product ${id} after discount removal: ${error?.message || error}`,
        error?.stack,
        'ProductService',
      );
    }

    return updatedProduct;
  }

  async updateDiscount(
    id: string,
    discountIndex: number,
    updateData: Partial<{
      type: 'percentage' | 'fixed' | 'bulk';
      value: number;
      description: string;
      startDate: Date;
      endDate: Date;
      isActive: boolean;
      minQuantity: number;
    }>,
  ): Promise<Product> {
    const product = await this.productRepo.findById({ id });
    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    if (
      !product.discounts ||
      discountIndex < 0 ||
      discountIndex >= product.discounts.length
    ) {
      throw new BadRequestException(ERRORS.INVALID_DISCOUNT_INDEX);
    }

    // Validate updated data
    if (updateData.type === 'percentage' && updateData.value > 100) {
      throw new BadRequestException(ERRORS.PERCENTAGE_DISCOUNT_EXCEEDS);
    }

    if (updateData.type === 'bulk' && !updateData.minQuantity) {
      throw new BadRequestException(ERRORS.BULK_DISCOUNT_MIN_QTY_REQUIRED);
    }

    // Prepare update object
    const updateFields: any = { updatedAt: new Date() };
    Object.keys(updateData).forEach((key) => {
      const value = updateData[key];
      if (key === 'startDate' || key === 'endDate') {
        updateFields[`discounts.${discountIndex}.${key}`] = value
          ? new Date(value)
          : undefined;
      } else {
        updateFields[`discounts.${discountIndex}.${key}`] = value;
      }
    });

    const updatedProduct = await this.productRepo.update({
      id,
      update: { $set: updateFields },
    });

    await updatedProduct.populate(['detail', 'images', 'team']);

    // Réindexer après mise à jour de discount
    try {
      if ((updatedProduct as any).isPublished) {
        await this.searchService.indexProduct(updatedProduct as any);
      }
    } catch (err) {
      this.logger.error(
        'Failed to index product in Elasticsearch after discount update',
        err,
      );
    }

    return updatedProduct;
  }

  calculatePrice(
    product: Product,
    quantity = 1,
    calculateAt?: Date,
  ): {
    basePrice: number;
    finalPrice: number;
    totalPrice: number;
    discountsApplied: any[];
    currency: string;
  } {
    if (!product.basePrice) {
      throw new BadRequestException(ERRORS.PRODUCT_BASE_PRICE_MISSING);
    }

    const currentDate = calculateAt || new Date();
    let finalPrice = product.basePrice;
    const discountsApplied = [];

    // Filter active and time-valid discounts
    const validDiscounts = (product.discounts || []).filter((discount) => {
      if (!discount.isActive) return false;

      const isValidTime =
        (!discount.startDate || discount.startDate <= currentDate) &&
        (!discount.endDate || discount.endDate >= currentDate);

      const isValidQuantity =
        discount.type !== 'bulk' ||
        !discount.minQuantity ||
        quantity >= discount.minQuantity;

      return isValidTime && isValidQuantity;
    });

    // Apply discounts
    for (const discount of validDiscounts) {
      let discountAmount = 0;

      switch (discount.type) {
        case 'percentage':
          discountAmount = (finalPrice * discount.value) / 100;
          break;
        case 'fixed':
          discountAmount = discount.value;
          break;
        case 'bulk':
          if (quantity >= (discount.minQuantity || 0)) {
            if (discount.value <= 1) {
              discountAmount = (finalPrice * discount.value * 100) / 100;
            } else {
              discountAmount = discount.value;
            }
          }
          break;
      }

      finalPrice = Math.max(0, finalPrice - discountAmount);
      discountsApplied.push({
        type: discount.type,
        value: discount.value,
        discountAmount,
        description: discount.description,
      });
    }

    return {
      basePrice: product.basePrice,
      finalPrice,
      totalPrice: finalPrice * quantity,
      discountsApplied,
      currency: product.currency || 'MGA',
    };
  }

  async reindexAll() {
    this.logger.log('Starting reindex of all products...');
    // Use findBy with explicit filter instead of findAll for CLI context
    const products = await this.productRepo.findAll({
      filter: { isPublished: true },
      options: {
        populate: [{ path: 'detail' }, { path: 'images' }, { path: 'team' }],
      },
    });
    this.logger.log(`Found ${products.length} products to reindex`);
    await this.searchService.reindexAll(products as any);
    return {
      message: 'Reindexing completed',
      totalProducts: products.length,
    };
  }
}
