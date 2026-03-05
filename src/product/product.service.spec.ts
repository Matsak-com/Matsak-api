jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { ImageProductService } from '../image-product/image-product.service';
import { DetailProductService } from '../detail-product/detail-product.service';
import { SearchService } from '../elasticsearch/elasticsearch.service';
import { Product } from './product.schema';

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: any;
  let detailProductService: any;
  let searchService: any;

  const mockProductModel = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DetailProductRepository,
          useValue: {},
        },
        {
          provide: ImageProductService,
          useValue: {
            upload: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: DetailProductService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: SearchService,
          useValue: {
            indexProduct: jest.fn(),
            removeProduct: jest.fn(),
            searchProducts: jest.fn(),
            reindexAll: jest.fn(),
          },
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepo = module.get(ProductRepository);
    detailProductService = module.get(DetailProductService);
    searchService = module.get(SearchService);
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('creates a product, populates review stats, and indexes search', async () => {
      const dto: any = {
        detailData: {
          name: 'Painkiller',
          categoryId: '507f1f77bcf86cd799439011',
        },
        teamId: '507f1f77bcf86cd799439022',
        basePrice: 120,
        currency: 'MGA',
      };

      const createdId = new Types.ObjectId('507f1f77bcf86cd799439099');

      detailProductService.create.mockResolvedValue({ _id: 'detailId' });
      productRepo.create.mockResolvedValue({ _id: createdId });

      const populatedProduct: any = {
        _id: createdId,
        detail: 'detailId',
        images: [],
        team: new Types.ObjectId(dto.teamId),
        basePrice: dto.basePrice,
        currency: dto.currency,
        discounts: [],
        toObject: jest.fn().mockReturnValue({
          _id: createdId,
          detail: 'detailId',
          images: [],
          team: new Types.ObjectId(dto.teamId),
          basePrice: dto.basePrice,
          currency: dto.currency,
          discounts: [],
        }),
      };

      productRepo.findById.mockResolvedValue(populatedProduct);
      searchService.indexProduct.mockResolvedValue(undefined);

      const result = await service.createProduct(dto);

      expect(detailProductService.create).toHaveBeenCalledWith(dto.detailData);
      expect(productRepo.create).toHaveBeenCalledWith({
        doc: expect.objectContaining({
          detail: 'detailId',
          basePrice: dto.basePrice,
          currency: dto.currency,
          team: expect.any(Types.ObjectId),
          images: [],
        }),
      });
      expect(productRepo.findById).toHaveBeenCalledWith({
        id: createdId.toString(),
        options: {
          populate: [{ path: 'detail' }, { path: 'images' }, { path: 'team' }],
        },
      });
      expect(searchService.indexProduct).toHaveBeenCalledWith(populatedProduct);
      expect(result.averageRating).toBe(0);
      expect(result.reviewCount).toBe(0);
      expect(result.basePrice).toBe(dto.basePrice);
      expect(result.currency).toBe(dto.currency);
    });

    it('throws BadRequestException when duplicate product is detected', async () => {
      const dto: any = {
        detailData: {
          name: 'Painkiller',
          categoryId: '507f1f77bcf86cd799439011',
        },
        teamId: '507f1f77bcf86cd799439022',
      };

      detailProductService.create.mockResolvedValue({ _id: 'detailId' });
      productRepo.create.mockRejectedValue({ code: 11000 });

      await expect(service.createProduct(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(searchService.indexProduct).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft deletes the product and removes it from search', async () => {
      const productId = '507f1f77bcf86cd799439066';
      productRepo.findById.mockResolvedValue({ _id: productId });
      productRepo.update.mockResolvedValue({});

      await service.remove(productId);

      expect(productRepo.update).toHaveBeenCalledWith({
        id: productId,
        update: { deleted_at: expect.any(Date) },
      });
      expect(searchService.removeProduct).toHaveBeenCalledWith(productId);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(productRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('discount management', () => {
    it('throws BadRequestException when removing discount with invalid index', async () => {
      productRepo.findById.mockResolvedValue({ discounts: [] });

      await expect(service.removeDiscount('id', 0)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(productRepo.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when updating discount with invalid percentage', async () => {
      productRepo.findById.mockResolvedValue({ discounts: [{}] });

      await expect(
        service.updateDiscount('id', 0, { type: 'percentage', value: 150 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(productRepo.update).not.toHaveBeenCalled();
    });
  });
});
