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
import { Types } from 'mongoose';
import { ImageProductService } from 'src/image-product/image-product.service';
import { DetailProductService } from 'src/detail-product/detail-product.service';
import { DetailProduct } from 'src/detail-product/detail-product.schema';
import { SearchService } from '../elasticsearch/elasticsearch.service';
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
    try {
      this.logger.log('Initializing search service...');
      // Vous pouvez ajouter une initialisation si nécessaire
    } catch (error) {
      this.logger.error('Error initializing search service', error);
    }
  }

  async createProduct(
    createDto: ValidatedCreateProductDto,
    file?: Express.Multer.File,
  ): Promise<Product> {
    try {
      // 1️⃣ Créer le detailProduct
      const detail = (await this.detailProductService.create(
        createDto.detailData,
      )) as DetailProduct & { _id: string };

      const productDoc: any = {
        detail: detail._id,
        team: new Types.ObjectId(createDto.teamId),
        images: null,
        basePrice: createDto.basePrice,
        currency: createDto.currency || 'MGA',
        discounts: createDto.discounts
          ? createDto.discounts.map((d) => ({
              ...d,
              startDate: d.startDate ? new Date(d.startDate) : undefined,
              endDate: d.endDate ? new Date(d.endDate) : undefined,
            }))
          : [],
      };

      const created = await this.productRepo.create({ doc: productDoc });

      // 3️⃣ Si fichier image fourni, créer et associer directement depuis buffer
      if (file && created) {
        const uploadedImage = await this.imageservice.createFromBuffer({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          altText: '',
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
        await this.searchService.indexProduct(populated as any);
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
    updateProductDto: any,
    file?: Express.Multer.File,
  ): Promise<Product> {
    // Vérifier que le produit existe
    const existingProduct = await this.productRepo.findById({ id });
    if (!existingProduct) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    // Mise à jour du detailProduct
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

      const uploadedImage = await this.imageservice.createFromBuffer({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        altText: updateProductDto.imageData?.altText || '',
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
        const uploadedImage = await this.imageservice.createFromBuffer({
          buffer,
          originalname: updateProductDto.imageData.name || 'uploaded-image.jpg',
          mimetype: mimeType,
          altText: updateProductDto.imageData.altText || '',
        });

        imageId = new Types.ObjectId(uploadedImage._id as string);
        shouldUpdateImage = true;
      } catch (error) {
        this.logger.warn(
          `Failed to process base64 image data: ${(error as any).message}`,
        );
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

    if (updateProductDto.currency) {
      updateData.currency = updateProductDto.currency;
    }

    if (updateProductDto.teamId) {
      updateData.team = new Types.ObjectId(updateProductDto.teamId);
    }

    if (shouldUpdateImage) {
      updateData.images = imageId;
    }

    if (updateProductDto.discounts) {
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
    await this.searchService.indexProduct(updatedProduct as any);

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
    await this.searchService.removeProduct(id);
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

    // Réindexer après changement de prix
    await this.searchService.indexProduct(updatedProduct as any);

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
    await this.searchService.indexProduct(updatedProduct as any);

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
    await this.searchService.indexProduct(updatedProduct as any);

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
    await this.searchService.indexProduct(updatedProduct as any);

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
}