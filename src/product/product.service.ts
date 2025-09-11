import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  file?: Express.Multer.File
): Promise<Product> {
  try {
    // 1️⃣ Créer le detailProduct
    const detail = await this.detailProductService.create(
      createDto.detailData 
    ) as DetailProduct & { _id: string };


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
  file?: Express.Multer.File
): Promise<Product> {

  // Vérifier que le produit existe
  const existingProduct = await this.productRepo.findById( id );
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
    updateData.subcategory = new Types.ObjectId(updateProductDto.subcategoryId);
  }
  
  if (typeof updateProductDto.isActive !== 'undefined') {
    updateData.isActive = updateProductDto.isActive;
  }
  
  if (imageId) {
    updateData.images = imageId;
  }

  // Appliquer la mise à jour
  const updatedProduct = await this.productRepo.update(id, updateData);

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
}