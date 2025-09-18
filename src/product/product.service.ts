import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Product, ProductDocument } from './product.schema';
import { ProductRepository } from './product.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { Model, Types } from 'mongoose';
import { ImageProductService } from 'src/image-product/image-product.service';
import { InjectModel } from '@nestjs/mongoose';
import { DetailProductService } from 'src/detail-product/detail-product.service';
import { DetailProduct } from 'src/detail-product/detail-product.schema';

// Import des types Zod
import { z } from 'zod';
import { createProductSchema } from '../common/schemas/product.schemas';

// Type validé par Zod
type ValidatedCreateProductDto = z.infer<typeof createProductSchema>;

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
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

      // 2️⃣ Créer le produit en DB
      const product = new this.productModel({
        detail: detail._id,
        subcategory: new Types.ObjectId(createDto.subcategoryId),
        images: null,
      });
      await product.save();

      // 3️⃣ Si fichier image fourni, créer et associer directement depuis buffer
      if (file) {
        const uploadedImage = await this.imageservice.createFromBuffer({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          altText: '',
        });
        product.images = new Types.ObjectId(uploadedImage._id as string);
        await product.save();
      }

      await product.populate(['detail', 'images']);
      return product;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Product already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<Product[]> {
    return this.productRepo.findAll({
      filter: {},
      options: {
        populate: ['detail', 'subcategory', 'images'],
      },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findById({
      id,
      options: {
        populate: ['detail', 'subcategory', 'images'],
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
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
      throw new NotFoundException(`Product with id ${id} not found`);
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

    if (updateProductDto.subcategoryId) {
      updateData.subcategory = new Types.ObjectId(
        updateProductDto.subcategoryId,
      );
    }

    if (typeof updateProductDto.isActive !== 'undefined') {
      updateData.isActive = updateProductDto.isActive;
    }

    if (imageId) {
      updateData.images = imageId;
    }

    // Appliquer la mise à jour
    const updatedProduct = await this.productRepo.update({
      id,
      update: updateData,
    });

    // Populate et retourner
    await updatedProduct.populate(['detail', 'subcategory', 'images']);
    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productRepo.delete({ id });
    if (!result) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
  }

  async updateSubcategory(id: string, subcategoryId: string): Promise<Product> {
    const updatedProduct = await this.productRepo.update({
      id,
      update: {
        subcategory: new Types.ObjectId(subcategoryId),
      },
    });
    if (!updatedProduct) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return updatedProduct;
  }

  // Pricing methods
  async setPrice(
    id: string,
    basePrice: number,
    currency = 'MGA',
  ): Promise<Product> {
    const product = await this.productRepo.findById({ id });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    const updatedProduct = await this.productRepo.update({
      id,
      update: {
        basePrice,
        currency,
      },
    });

    await updatedProduct.populate(['detail', 'subcategory', 'images']);
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
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Validate discount data
    if (discountData.type === 'percentage' && discountData.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    if (discountData.type === 'bulk' && !discountData.minQuantity) {
      throw new BadRequestException(
        'Bulk discount requires minimum quantity',
      );
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

    await updatedProduct.populate(['detail', 'subcategory', 'images']);
    return updatedProduct;
  }

  async removeDiscount(id: string, discountIndex: number): Promise<Product> {
    const product = await this.productRepo.findById({ id });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    if (
      !product.discounts ||
      discountIndex < 0 ||
      discountIndex >= product.discounts.length
    ) {
      throw new BadRequestException('Invalid discount index');
    }

    const updatedProduct = await this.productRepo.update({
      id,
      update: {
        $unset: { [`discounts.${discountIndex}`]: 1 },
      },
    });

    // Remove null elements from array
    await this.productRepo.update({
      id,
      update: {
        $pull: { discounts: null },
      },
    });

    const finalProduct = await this.productRepo.findById({ id });
    await finalProduct.populate(['detail', 'subcategory', 'images']);
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
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    if (
      !product.discounts ||
      discountIndex < 0 ||
      discountIndex >= product.discounts.length
    ) {
      throw new BadRequestException('Invalid discount index');
    }

    // Validate updated data
    if (updateData.type === 'percentage' && updateData.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    if (updateData.type === 'bulk' && !updateData.minQuantity) {
      throw new BadRequestException(
        'Bulk discount requires minimum quantity',
      );
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

    await updatedProduct.populate(['detail', 'subcategory', 'images']);
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
      throw new BadRequestException('Product has no base price set');
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
