import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { DetailProductRepository } from '../detail-product/detail-product.repository';
import { ImageProductService } from '../image-product/image-product.service';
import { DetailProductService } from '../detail-product/detail-product.service';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from './product.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProductService - Pricing', () => {
  let service: ProductService;
  let productRepository: jest.Mocked<ProductRepository>;
  let mockProductModel: any;

  const mockProduct = {
    _id: '507f1f77bcf86cd799439011',
    detail: '507f1f77bcf86cd799439012',
    images: '507f1f77bcf86cd799439014',
    basePrice: 100,
    currency: 'MGA',
    discounts: [
      {
        type: 'percentage',
        value: 10,
        description: '10% off',
        isActive: true,
      },
      {
        type: 'fixed',
        value: 5,
        description: '$5 off',
        isActive: true,
      },
    ],
    populate: jest.fn().mockResolvedValue(this),
  } as any;

  beforeEach(async () => {
    const mockProductRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockDetailRepo = {
      findById: jest.fn(),
    };

    const mockImageService = {
      createFromBuffer: jest.fn(),
    };

    const mockDetailService = {
      create: jest.fn(),
    };

    mockProductModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: mockProductRepo,
        },
        {
          provide: DetailProductRepository,
          useValue: mockDetailRepo,
        },
        {
          provide: ImageProductService,
          useValue: mockImageService,
        },
        {
          provide: DetailProductService,
          useValue: mockDetailService,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(ProductRepository);
  });

  describe('setPrice', () => {
    it('should set product price successfully', async () => {
      const productId = '507f1f77bcf86cd799439011';
      const basePrice = 150;
      const currency = 'USD';

      productRepository.findById.mockResolvedValue(mockProduct);
      const updatedProduct = {
        ...mockProduct,
        basePrice,
        currency,
        populate: jest.fn().mockResolvedValue(this),
      };
      productRepository.update.mockResolvedValue(updatedProduct);

      const result = await service.setPrice(productId, basePrice, currency);

      expect(productRepository.findById).toHaveBeenCalledWith({
        id: productId,
      });
      expect(productRepository.update).toHaveBeenCalledWith({
        id: productId,
        update: { basePrice, currency },
      });
      expect(result.basePrice).toBe(basePrice);
      expect(result.currency).toBe(currency);
    });

    it('should throw NotFoundException when product not found', async () => {
      const productId = '507f1f77bcf86cd799439011';
      productRepository.findById.mockResolvedValue(null);

      await expect(service.setPrice(productId, 100, 'MGA')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addDiscount', () => {
    it('should add percentage discount successfully', async () => {
      const productId = '507f1f77bcf86cd799439011';
      const discountData = {
        type: 'percentage' as const,
        value: 15,
        description: '15% off sale',
        isActive: true,
      };

      productRepository.findById.mockResolvedValue(mockProduct);
      const updatedProduct = {
        ...mockProduct,
        discounts: [...mockProduct.discounts, discountData],
        populate: jest.fn().mockResolvedValue(this),
      };
      productRepository.update.mockResolvedValue(updatedProduct);

      expect(productRepository.findById).toHaveBeenCalledWith({
        id: productId,
      });
      expect(productRepository.update).toHaveBeenCalledWith({
        id: productId,
        update: { $push: { discounts: discountData } },
      });
      const calledUpdated = productRepository.update.mock.results[0].value;
      expect(calledUpdated).toBeDefined();
    });

    it('should throw BadRequestException for percentage > 100', async () => {
      const productId = '507f1f77bcf86cd799439011';
      const discountData = {
        type: 'percentage' as const,
        value: 150,
        description: 'Invalid discount',
      };

      productRepository.findById.mockResolvedValue(mockProduct);

      await expect(
        service.addDiscount(productId, discountData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for bulk discount without minQuantity', async () => {
      const productId = '507f1f77bcf86cd799439011';
      const discountData = {
        type: 'bulk' as const,
        value: 10,
        description: 'Bulk discount',
      };

      productRepository.findById.mockResolvedValue(mockProduct);

      await expect(
        service.addDiscount(productId, discountData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('calculatePrice', () => {
    it('should calculate price with percentage discount', () => {
      const product = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [
          {
            type: 'percentage',
            value: 10,
            isActive: true,
          },
        ],
      } as Product;

      const result = service.calculatePrice(product, 1);

      expect(result.basePrice).toBe(100);
      expect(result.finalPrice).toBe(90); // 100 - 10%
      expect(result.totalPrice).toBe(90);
      expect(result.discountsApplied).toHaveLength(1);
      expect(result.currency).toBe('MGA');
    });

    it('should calculate price with fixed discount', () => {
      const product = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [
          {
            type: 'fixed',
            value: 15,
            isActive: true,
          },
        ],
      } as Product;

      const result = service.calculatePrice(product, 1);

      expect(result.finalPrice).toBe(85); // 100 - 15
      expect(result.totalPrice).toBe(85);
    });

    it('should calculate price with bulk discount', () => {
      const product = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [
          {
            type: 'bulk',
            value: 20,
            minQuantity: 5,
            isActive: true,
          },
        ],
      } as Product;

      const result = service.calculatePrice(product, 5);

      expect(result.finalPrice).toBe(80); // 100 - 20
      expect(result.totalPrice).toBe(400); // 80 * 5
    });

    it('should not apply bulk discount for insufficient quantity', () => {
      const product = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [
          {
            type: 'bulk',
            value: 20,
            minQuantity: 5,
            isActive: true,
          },
        ],
      } as Product;

      const result = service.calculatePrice(product, 3);

      expect(result.finalPrice).toBe(100); // No discount applied
      expect(result.totalPrice).toBe(300); // 100 * 3
      expect(result.discountsApplied).toHaveLength(0);
    });

    it('should apply multiple discounts', () => {
      const product = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [
          {
            type: 'percentage',
            value: 10,
            isActive: true,
          },
          {
            type: 'fixed',
            value: 5,
            isActive: true,
          },
        ],
      } as Product;

      const result = service.calculatePrice(product, 1);

      expect(result.finalPrice).toBe(85); // 100 - 10% - 5 = 85
      expect(result.discountsApplied).toHaveLength(2);
    });

    it('should ignore inactive discounts', () => {
      const product = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [
          {
            type: 'percentage',
            value: 10,
            isActive: false,
          },
          {
            type: 'fixed',
            value: 5,
            isActive: true,
          },
        ],
      } as Product;

      const result = service.calculatePrice(product, 1);

      expect(result.finalPrice).toBe(95); // 100 - 5
      expect(result.discountsApplied).toHaveLength(1);
    });

    it('should handle time-based discounts', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const product = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [
          {
            type: 'percentage',
            value: 10,
            isActive: true,
            startDate: yesterday,
            endDate: tomorrow,
          },
          {
            type: 'fixed',
            value: 5,
            isActive: true,
            startDate: tomorrow, // Starts tomorrow, shouldn't apply
          },
        ],
      } as Product;

      const result = service.calculatePrice(product, 1, now);

      expect(result.finalPrice).toBe(90); // Only first discount applies
      expect(result.discountsApplied).toHaveLength(1);
    });

    it('should throw BadRequestException when no base price set', () => {
      const product = {
        currency: 'MGA',
        discounts: [],
      } as Product;

      expect(() => service.calculatePrice(product, 1)).toThrow(
        BadRequestException,
      );
    });
  });
});
