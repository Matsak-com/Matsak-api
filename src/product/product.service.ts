import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { Product } from './product.schema';
import { ProductRepository } from './product.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { FilterQuery, Types } from 'mongoose';
import { ImageProductService } from 'src/image-product/image-product.service';
import { DetailProductService } from 'src/detail-product/detail-product.service';
import { DetailProduct } from 'src/detail-product/detail-product.schema';
import { SearchService } from '../elasticsearch/elasticsearch.service';
import { UpdateProductDto } from './dto/update-product.dto';

import { z } from 'zod';
import { createProductSchema } from '../common/schemas/product.schemas';

type ValidatedCreateProductDto = z.infer<typeof createProductSchema>;

@Injectable()
export class ProductService {
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
    file?: Express.Multer.File,
  ): Promise<Product> {
    try {
      const detail = (await this.detailProductService.create(
        createDto.detailData,
      )) as DetailProduct & { _id: string };

      const productDoc: any = {
        detail: detail._id,
        team: new Types.ObjectId(createDto.teamId),
        images: null,
        basePrice: createDto.basePrice ?? createDto.price ?? 0,
        currency: createDto.currency || 'MGA',
        discounts: createDto.discounts
          ? createDto.discounts.map((d) => ({
              ...d,
              startDate: d.startDate ? new Date(d.startDate) : undefined,
              endDate: d.endDate ? new Date(d.endDate) : undefined,
            }))
          : [],
        isActive: createDto.isActive !== undefined ? createDto.isActive : true, // Default to active
      };

      const created = await this.productRepo.create({ doc: productDoc });

      // 3️⃣ Si fichier image fourni, créer et associer directement depuis buffer
      if (file && created) {
        const uploadedImage = await this.imageservice.upload({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
        });
        await this.productRepo.update({
          id: (created as any)._id.toString(),
          update: { images: new Types.ObjectId(uploadedImage._id as string) },
        });
      }

      const populated = await this.productRepo.findById({
        id: (created as any)._id.toString(),
        options: { populate: ['detail', 'images', 'team'] },
      });

      // Indexer dans Elasticsearch
      if (populated) {
        try {
          await this.searchService.indexProduct(populated as any);
        } catch (indexError) {
          this.logger.error('Failed to index product in Elasticsearch', indexError);
        }
      }

      return populated as Product;
    } catch (error) {
      if ((error as any).code === 11000) {
        throw new BadRequestException(ERRORS.PRODUCT_ALREADY_EXISTS);
      }
      this.logger.error('Error creating product', error);
      throw error;
    }
  }

  async findAll(): Promise<Product[]> {
    return this.productRepo.findAll({
      filter: { deleted_at: { $exists: false } },
      options: {
        populate: ['detail', 'images', 'team'],
      },
    });
  }

  async findBy({
    filter,
  }: {
    filter: FilterQuery<Product>;
  }): Promise<Product[]> {
    return this.productRepo.findAll({
      filter,
      options: {
        populate: ['detail', 'images'],
      },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findById({
      id,
      options: {
        populate: ['detail', 'images', 'team'],
      },
    });
    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }
    return product;
  }

  async search(keyword: string) {
    return this.searchService.searchProducts(keyword);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    file?: Express.Multer.File,
  ): Promise<Product> {
    // Vérifier que le produit existe
    const existingProduct = await this.productRepo.findById({ id });
    if (!existingProduct) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    if (updateProductDto.detailData) {
      await this.detailProductService.update(
        existingProduct.detail.toString(),
        updateProductDto.detailData,
      );
    }

    let imageId = existingProduct.images;
    let shouldUpdateImage = false;

    if (file && file instanceof Object && file.buffer) {
      if (existingProduct.images) {
        await this.imageservice.remove(existingProduct.images.toString());
      }

      const uploadedImage = await this.imageservice.upload({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      });

      imageId = new Types.ObjectId(uploadedImage._id as string);
      shouldUpdateImage = true;
    } else if (updateProductDto.imageData?.data) {
      // Supprimer l'ancienne image si elle existe
      if (existingProduct.images) {
        await this.imageservice.remove(existingProduct.images.toString());
      }

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

        // Créer la nouvelle image à partir des données base64
        const uploadedImage = await this.imageservice.upload({
          buffer,
          originalname: updateProductDto.imageData.name || 'uploaded-image.jpg',
          mimetype: mimeType,
        });

        imageId = new Types.ObjectId(uploadedImage._id as string);
        shouldUpdateImage = true;
      } catch {
        // Continue without updating image
      }
    } else if (
      updateProductDto.imageData === null ||
      (updateProductDto.imageData && updateProductDto.imageData.data === null)
    ) {
      // Remove existing image if any
      if (existingProduct.images) {
        await this.imageservice.remove(existingProduct.images.toString());
      }
      imageId = null;
      shouldUpdateImage = true;
    }

    // Construire les données de mise à jour du produit
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (typeof updateProductDto.isActive !== 'undefined') {
      updateData.isActive = updateProductDto.isActive;
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

    if (shouldUpdateImage) {
      updateData.images = imageId;
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

    // Réindexer dans Elasticsearch
    try {
      await this.searchService.indexProduct(updatedProduct as any);
    } catch (indexError) {
      this.logger.error(
        `Failed to index product ${updatedProduct._id} in Elasticsearch: ${indexError?.message || indexError}`,
      );
    }

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.productRepo.findById({ id });
    if (!product) {
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
      Logger.error(`Failed to remove product ${id} from Elasticsearch: ${error?.message || error}`);
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
      await this.searchService.indexProduct(updatedProduct as any);
    } catch (error) {
      Logger.error(`Failed to index product ${id} after price update: ${error?.message || error}`);
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
      endDate: discountData.endDate ? new Date(discountData.endDate) : undefined,
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
      await this.searchService.indexProduct(updatedProduct as any);
    } catch (error) {
      Logger.error(`Failed to index product ${id} after price update: ${error?.message || error}`);
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
      await this.searchService.indexProduct(updatedProduct as any);
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
      await this.searchService.indexProduct(updatedProduct as any);
    } catch (err) {
      this.logger.error('Failed to index product in Elasticsearch after discount update', err);
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
      filter: { deleted_at: { $exists: false } },
      options: {
        populate: ['detail', 'images', 'team'],
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