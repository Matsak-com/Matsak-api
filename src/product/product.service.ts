import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { Product } from './product.schema';
import { ProductRepository } from './product.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { Types } from 'mongoose';
import { ImageProductService } from 'src/image-product/image-product.service';
import { DetailProductService } from 'src/detail-product/detail-product.service';
import { DetailProduct } from 'src/detail-product/detail-product.schema';

import { z } from 'zod';
import { createProductSchema } from '../common/schemas/product.schemas';

// Type validé par Zod
type ValidatedCreateProductDto = z.infer<typeof createProductSchema>;

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly detailRepo: DetailProductRepository,
    private readonly imageservice: ImageProductService,
    private readonly detailProductService: DetailProductService,
  ) {}

  async createProduct(
    createDto: ValidatedCreateProductDto,
    file?: Express.Multer.File,
  ): Promise<Product> {
    try {
      // 1️⃣ Créer le detailProduct
      const detail = (await this.detailProductService.create(
        createDto.detailData,
      )) as DetailProduct & { _id: string };

      // 2️⃣ Créer le produit en DB via repository
      const productDoc: any = {
        detail: detail._id,
        team: new Types.ObjectId(createDto.teamId),
        images: null,
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
      return populated as Product;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(ERRORS.PRODUCT_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async findAll(): Promise<Product[]> {
    return this.productRepo.findAll({
      filter: {},
      options: {
        populate: ['detail', 'images'],
      },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findById({
      id,
      options: {
        populate: ['detail', 'images'],
      },
    });
    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }
    return product;
  }

  async update(
    id: string,
    updateProductDto,
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

    // Gestion de l'image
    let imageId = existingProduct.images;
    if (file) {
      // Supprimer l'ancienne image si elle existe
      if (existingProduct.images) {
        await this.imageservice.remove(existingProduct.images.toString());
      }

      // Créer la nouvelle image
      const uploadedImage = await this.imageservice.createFromBuffer({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        altText: updateProductDto.imageData?.altText || '',
      });

      imageId = new Types.ObjectId(uploadedImage._id as string);
    }

    // Construire les données de mise à jour
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (typeof updateProductDto.isActive !== 'undefined') {
      updateData.isActive = updateProductDto.isActive;
    }

    if (imageId) {
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
    await updatedProduct.populate(['detail', 'images']);
    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productRepo.delete({ id });
    if (!result) {
      throw new NotFoundException(`Product with id ${id} not found`);
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
      },
    });

    await updatedProduct.populate(['detail', 'images']);
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
      isActive: discountData.isActive ?? true,
    };

    const updatedProduct = await this.productRepo.update({
      id,
      update: {
        $push: { discounts: discount },
      },
    });

    await updatedProduct.populate(['detail', 'images']);
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

    // Remove null elements from array
    await this.productRepo.update({
      id,
      update: {
        $pull: { discounts: null },
      },
    });

    const finalProduct = await this.productRepo.findById({ id });
    await finalProduct.populate(['detail', 'images']);
    return finalProduct;
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
    const updateFields = {};
    Object.keys(updateData).forEach((key) => {
      updateFields[`discounts.${discountIndex}.${key}`] = updateData[key];
    });

    const updatedProduct = await this.productRepo.update({
      id,
      update: { $set: updateFields },
    });

    await updatedProduct.populate(['detail', 'images']);
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
          if (quantity >= discount.minQuantity) {
            if (discount.value <= 1) {
              // Treat as percentage if value is <= 1
              discountAmount = (finalPrice * discount.value * 100) / 100;
            } else {
              // Treat as fixed amount
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
