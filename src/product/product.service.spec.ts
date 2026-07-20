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
import { ProductCsvService } from './csv/product-csv.service';
import { Product } from './product.schema';
import { Category } from '../categories/category.schema';

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: any;
  let detailProductService: any;
  let imageService: any;
  let searchService: any;
  let categoryModel: any;
  let csvService: any;

  const mockProductModel = {};
  const mockCategoryModel = {
    findOne: jest.fn(),
  };

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
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: ProductCsvService,
          useValue: {
            parseCSV: jest.fn(),
            validateProductRecord: jest.fn(),
            recordToProductPayload: jest.fn(),
            exportToCSV: jest.fn(),
            getCSVTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepo = module.get(ProductRepository);
    detailProductService = module.get(DetailProductService);
    imageService = module.get(ImageProductService);
    searchService = module.get(SearchService);
    categoryModel = module.get(getModelToken(Category.name));
    csvService = module.get(ProductCsvService);
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    const dto: any = {
      detailData: {
        name: 'Painkiller',
        categoryId: '507f1f77bcf86cd799439011',
      },
      teamId: '507f1f77bcf86cd799439022',
      basePrice: 120,
      currency: 'MGA',
    };

    it('creates a product, populates review stats, and indexes search', async () => {
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
      detailProductService.create.mockResolvedValue({ _id: 'detailId' });
      productRepo.create.mockRejectedValue({ code: 11000 });

      await expect(service.createProduct(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(searchService.indexProduct).not.toHaveBeenCalled();
    });

    it('does not fail the whole operation when Elasticsearch indexing fails', async () => {
      const createdId = new Types.ObjectId('507f1f77bcf86cd799439099');
      detailProductService.create.mockResolvedValue({ _id: 'detailId' });
      productRepo.create.mockResolvedValue({ _id: createdId });

      const populatedProduct: any = {
        _id: createdId,
        toObject: jest.fn().mockReturnValue({ _id: createdId }),
      };
      productRepo.findById.mockResolvedValue(populatedProduct);
      searchService.indexProduct.mockRejectedValue(new Error('ES down'));

      const result = await service.createProduct(dto);

      expect(result).toBeDefined();
      expect(searchService.indexProduct).toHaveBeenCalledWith(populatedProduct);
    });

    it('rolls back product/detail when image upload fails', async () => {
      const createdId = new Types.ObjectId('507f1f77bcf86cd799439099');
      detailProductService.create.mockResolvedValue({ _id: 'detailId' });
      productRepo.create.mockResolvedValue({ _id: createdId });
      imageService.upload.mockRejectedValue(new Error('upload failed'));

      const files: any = [
        { buffer: Buffer.from(''), originalname: 'a.png', mimetype: 'image/png' },
      ];

      await expect(service.createProduct(dto, files)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(productRepo.delete).toHaveBeenCalledWith({ id: createdId.toString() });
      expect(detailProductService.remove).toHaveBeenCalledWith('detailId');
      expect(searchService.indexProduct).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all non-deleted products with review stats', async () => {
      productRepo.findAll.mockResolvedValue([
        { _id: '1', toObject: jest.fn().mockReturnValue({ _id: '1' }) },
      ]);

      const result = await service.findAll();

      expect(productRepo.findAll).toHaveBeenCalledWith({
        filter: { deleted_at: { $exists: false } },
        options: {
          populate: [{ path: 'detail' }, { path: 'images' }, { path: 'team' }],
        },
      });
      expect(result[0].averageRating).toBe(0);
      expect(result[0].reviewCount).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns the product with review stats when found', async () => {
      productRepo.findById.mockResolvedValue({
        _id: 'id1',
        toObject: jest.fn().mockReturnValue({ _id: 'id1' }),
      });

      const result = await service.findOne('id1');

      expect(result.averageRating).toBe(0);
      expect(result.reviewCount).toBe(0);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    it('delegates to the search service', async () => {
      searchService.searchProducts.mockResolvedValue(['result']);

      const result = await service.search('painkiller');

      expect(searchService.searchProducts).toHaveBeenCalledWith('painkiller');
      expect(result).toEqual(['result']);
    });
  });

  describe('update', () => {
    it('updates base fields and reindexes the product', async () => {
      const existingProduct: any = {
        _id: 'id1',
        detail: { toString: () => 'detailId' },
        images: [],
      };
      productRepo.findById.mockResolvedValue(existingProduct);

      const updatedProduct: any = {
        _id: 'id1',
        populate: jest.fn().mockResolvedValue(undefined),
      };
      productRepo.update.mockResolvedValue(updatedProduct);

      const dto: any = { basePrice: 200, currency: 'USD' };
      const result = await service.update('id1', dto);

      expect(productRepo.update).toHaveBeenCalledWith({
        id: 'id1',
        update: expect.objectContaining({
          basePrice: 200,
          currency: 'USD',
          updatedAt: expect.any(Date),
        }),
      });
      expect(updatedProduct.populate).toHaveBeenCalledWith([
        'detail',
        'images',
        'team',
      ]);
      expect(searchService.indexProduct).toHaveBeenCalledWith(updatedProduct);
      expect(result).toBe(updatedProduct);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findById.mockResolvedValue(null);

      await expect(service.update('missing', {} as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(productRepo.update).not.toHaveBeenCalled();
    });

    it('does not fail the update when Elasticsearch reindexing fails', async () => {
      const existingProduct: any = {
        _id: 'id1',
        detail: { toString: () => 'detailId' },
        images: [],
      };
      productRepo.findById.mockResolvedValue(existingProduct);

      const updatedProduct: any = {
        _id: 'id1',
        populate: jest.fn().mockResolvedValue(undefined),
      };
      productRepo.update.mockResolvedValue(updatedProduct);
      searchService.indexProduct.mockRejectedValue(new Error('ES down'));

      const result = await service.update('id1', { basePrice: 50 } as any);

      expect(result).toBe(updatedProduct);
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

  describe('setPrice', () => {
    it('updates the price/currency and reindexes', async () => {
      productRepo.findById.mockResolvedValue({ _id: 'id1' });
      const updatedProduct: any = {
        _id: 'id1',
        populate: jest.fn().mockResolvedValue(undefined),
      };
      productRepo.update.mockResolvedValue(updatedProduct);

      const result = await service.setPrice('id1', 300, 'EUR');

      expect(productRepo.update).toHaveBeenCalledWith({
        id: 'id1',
        update: {
          basePrice: 300,
          currency: 'EUR',
          updatedAt: expect.any(Date),
        },
      });
      expect(searchService.indexProduct).toHaveBeenCalledWith(updatedProduct);
      expect(result).toBe(updatedProduct);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findById.mockResolvedValue(null);

      await expect(service.setPrice('missing', 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('addDiscount', () => {
    it('pushes a new discount and reindexes', async () => {
      productRepo.findById.mockResolvedValue({ _id: 'id1', discounts: [] });
      const updatedProduct: any = {
        _id: 'id1',
        populate: jest.fn().mockResolvedValue(undefined),
      };
      productRepo.update.mockResolvedValue(updatedProduct);

      const discountData = { type: 'percentage' as const, value: 10 };
      const result = await service.addDiscount('id1', discountData);

      expect(productRepo.update).toHaveBeenCalledWith({
        id: 'id1',
        update: {
          $push: { discounts: expect.objectContaining({ type: 'percentage', value: 10 }) },
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toBe(updatedProduct);
    });

    it('throws BadRequestException when percentage discount exceeds 100', async () => {
      productRepo.findById.mockResolvedValue({ _id: 'id1', discounts: [] });

      await expect(
        service.addDiscount('id1', { type: 'percentage', value: 150 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(productRepo.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when bulk discount has no minQuantity', async () => {
      productRepo.findById.mockResolvedValue({ _id: 'id1', discounts: [] });

      await expect(
        service.addDiscount('id1', { type: 'bulk', value: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(productRepo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findById.mockResolvedValue(null);

      await expect(
        service.addDiscount('missing', { type: 'fixed', value: 5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('discount management', () => {
    it('removes a discount at the given index', async () => {
      productRepo.findById.mockResolvedValue({
        _id: 'id1',
        discounts: [{ type: 'fixed', value: 5 }],
      });
      const updatedProduct: any = {
        _id: 'id1',
        populate: jest.fn().mockResolvedValue(undefined),
      };
      productRepo.update.mockResolvedValue(updatedProduct);

      const result = await service.removeDiscount('id1', 0);

      expect(productRepo.update).toHaveBeenCalledWith({
        id: 'id1',
        update: { discounts: [], updatedAt: expect.any(Date) },
      });
      expect(result).toBe(updatedProduct);
    });

    it('throws BadRequestException when removing discount with invalid index', async () => {
      productRepo.findById.mockResolvedValue({ discounts: [] });

      await expect(service.removeDiscount('id', 0)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(productRepo.update).not.toHaveBeenCalled();
    });

    it('updates a discount at the given index', async () => {
      productRepo.findById.mockResolvedValue({
        _id: 'id1',
        discounts: [{ type: 'fixed', value: 5 }],
      });
      const updatedProduct: any = {
        _id: 'id1',
        populate: jest.fn().mockResolvedValue(undefined),
      };
      productRepo.update.mockResolvedValue(updatedProduct);

      const result = await service.updateDiscount('id1', 0, {
        type: 'percentage',
        value: 20,
      });

      expect(productRepo.update).toHaveBeenCalledWith({
        id: 'id1',
        update: {
          $set: expect.objectContaining({
            'discounts.0.type': 'percentage',
            'discounts.0.value': 20,
          }),
        },
      });
      expect(result).toBe(updatedProduct);
    });

    it('throws BadRequestException when updating discount with invalid percentage', async () => {
      productRepo.findById.mockResolvedValue({ discounts: [{}] });

      await expect(
        service.updateDiscount('id', 0, { type: 'percentage', value: 150 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(productRepo.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when updating bulk discount without minQuantity', async () => {
      productRepo.findById.mockResolvedValue({ discounts: [{}] });

      await expect(
        service.updateDiscount('id', 0, { type: 'bulk', value: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(productRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('calculatePrice', () => {
    it('throws BadRequestException when the product has no basePrice', () => {
      expect(() =>
        service.calculatePrice({ basePrice: undefined } as any),
      ).toThrow(BadRequestException);
    });

    it('applies an active percentage discount', () => {
      const product: any = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [{ type: 'percentage', value: 10, isActive: true }],
      };

      const result = service.calculatePrice(product);

      expect(result.finalPrice).toBe(90);
      expect(result.totalPrice).toBe(90);
      expect(result.discountsApplied).toHaveLength(1);
    });

    it('ignores inactive or out-of-range discounts', () => {
      const product: any = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [
          { type: 'fixed', value: 20, isActive: false },
          {
            type: 'bulk',
            value: 15,
            isActive: true,
            minQuantity: 10,
          },
        ],
      };

      const result = service.calculatePrice(product, 1);

      expect(result.finalPrice).toBe(100);
      expect(result.discountsApplied).toHaveLength(0);
    });

    it('applies a bulk discount when quantity meets the minimum', () => {
      const product: any = {
        basePrice: 100,
        currency: 'MGA',
        discounts: [{ type: 'bulk', value: 20, isActive: true, minQuantity: 5 }],
      };

      const result = service.calculatePrice(product, 5);

      expect(result.finalPrice).toBe(80);
      expect(result.totalPrice).toBe(400);
    });
  });

  describe('reindexAll', () => {
    it('reindexes every non-deleted product', async () => {
      const products = [{ _id: '1' }, { _id: '2' }];
      productRepo.findAll.mockResolvedValue(products);
      searchService.reindexAll.mockResolvedValue(undefined);

      const result = await service.reindexAll();

      expect(productRepo.findAll).toHaveBeenCalledWith({
        filter: { deleted_at: { $exists: false } },
        options: {
          populate: [{ path: 'detail' }, { path: 'images' }, { path: 'team' }],
        },
      });
      expect(searchService.reindexAll).toHaveBeenCalledWith(products);
      expect(result).toEqual({
        message: 'Reindexing completed',
        totalProducts: 2,
      });
    });
  });

  describe('bulkImportFromCSV', () => {
    it('throws BadRequestException when the CSV has no rows', async () => {
      csvService.parseCSV.mockResolvedValue([]);

      await expect(
        service.bulkImportFromCSV(Buffer.from(''), '507f1f77bcf86cd799439055'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('imports valid rows, resolving the category and creating each product', async () => {
      csvService.parseCSV.mockResolvedValue([{ name: 'Prod', categoryName: 'Meds' }]);
      csvService.validateProductRecord.mockReturnValue({ valid: true, errors: [] });
      categoryModel.findOne.mockResolvedValue({ _id: 'catId' });
      csvService.recordToProductPayload.mockReturnValue({
        detailData: { name: 'Prod', categoryId: 'catId' },
        teamId: '507f1f77bcf86cd799439055',
      });

      detailProductService.create.mockResolvedValue({ _id: 'detailId' });
      productRepo.create.mockResolvedValue({ _id: new Types.ObjectId() });
      productRepo.findById.mockResolvedValue({
        _id: 'prodId',
        toObject: jest.fn().mockReturnValue({ _id: 'prodId' }),
      });

      const result = await service.bulkImportFromCSV(
        Buffer.from(''),
        '507f1f77bcf86cd799439055',
        true,
      );

      expect(categoryModel.findOne).toHaveBeenCalled();
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('collects row errors and continues when skipOnError is true', async () => {
      csvService.parseCSV.mockResolvedValue([{ name: 'Bad row' }]);
      csvService.validateProductRecord.mockReturnValue({
        valid: false,
        errors: ['name is required'],
      });

      const result = await service.bulkImportFromCSV(
        Buffer.from(''),
        '507f1f77bcf86cd799439055',
        true,
      );

      expect(result.failed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({ row: 2, error: 'name is required' }),
      );
    });

    it('throws on the first invalid row when skipOnError is false', async () => {
      csvService.parseCSV.mockResolvedValue([{ name: 'Bad row' }]);
      csvService.validateProductRecord.mockReturnValue({
        valid: false,
        errors: ['name is required'],
      });

      await expect(
        service.bulkImportFromCSV(
          Buffer.from(''),
          '507f1f77bcf86cd799439055',
          false,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('bulkExportToCSV', () => {
    it('returns the CSV template when the team has no products', async () => {
      productRepo.findAll.mockResolvedValue([]);
      csvService.getCSVTemplate.mockReturnValue(Buffer.from('template'));

      const result = await service.bulkExportToCSV('507f1f77bcf86cd799439055');

      expect(csvService.getCSVTemplate).toHaveBeenCalled();
      expect(result.toString()).toBe('template');
    });

    it('exports the team products to CSV', async () => {
      const products = [{ _id: '1' }];
      productRepo.findAll.mockResolvedValue(products);
      csvService.exportToCSV.mockResolvedValue(Buffer.from('csv-data'));

      const result = await service.bulkExportToCSV('507f1f77bcf86cd799439055');

      expect(csvService.exportToCSV).toHaveBeenCalledWith(products);
      expect(result.toString()).toBe('csv-data');
    });
  });

  describe('getCSVTemplate', () => {
    it('delegates to the csv service', () => {
      csvService.getCSVTemplate.mockReturnValue(Buffer.from('template'));

      const result = service.getCSVTemplate();

      expect(result.toString()).toBe('template');
    });
  });
});