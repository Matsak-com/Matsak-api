import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ProductRepository } from '../product/product.repository';
import { SearchService } from '../elasticsearch/elasticsearch.service';
import { StockLotRepository } from './stock-lot.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: jest.Mocked<InventoryRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let stockLotRepo: jest.Mocked<StockLotRepository>;

  const mockProduct = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    stockQuantity: 100,
    lowStockThreshold: 10,
    trackStock: true,
    team: new Types.ObjectId('507f1f77bcf86cd799439012'),
    populate: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const mockInventoryRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const mockProductRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    };

    const mockSearchService = {
      indexProduct: jest.fn(),
      removeProduct: jest.fn(),
      searchProducts: jest.fn(),
      reindexAll: jest.fn(),
    };

    const mockStockLotRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: mockInventoryRepo,
        },
        {
          provide: ProductRepository,
          useValue: mockProductRepo,
        },
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: StockLotRepository,
          useValue: mockStockLotRepo,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepo = module.get(InventoryRepository);
    productRepo = module.get(ProductRepository);
    stockLotRepo = module.get(StockLotRepository);
  });

  describe('stockIn', () => {
    const baseStockInDto = {
      productId: '507f1f77bcf86cd799439011',
      reason: 'Purchase',
      reference: 'PO-123',
      supplier: 'ACME Pharma',
      receptionDate: '2026-01-01',
      lots: [
        {
          quantity: 50,
          expirationDate: '2027-01-01',
        },
      ],
    };

    it('should add stock successfully with a single lot', async () => {
      productRepo.findById.mockResolvedValue(mockProduct as any);

      const createdLot = {
        _id: new Types.ObjectId(),
        product: mockProduct._id,
        lotNumber: 'LOT-20260101-ABCD-1',
        quantity: 50,
        initialQuantity: 50,
      };
      stockLotRepo.create.mockResolvedValue(createdLot as any);

      const transaction = {
        product: mockProduct._id,
        type: 'in',
        quantity: 50,
        previousStock: 100,
        newStock: 150,
        reason: 'Purchase',
        reference: 'PO-123',
        supplier: 'ACME Pharma',
        lots: [createdLot._id],
        team: mockProduct.team,
      };
      inventoryRepo.create.mockResolvedValue(transaction as any);
      productRepo.update.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 150,
      } as any);

      const result = await service.stockIn(baseStockInDto as any);

      expect(productRepo.findById).toHaveBeenCalledWith({
        id: baseStockInDto.productId,
      });
      expect(stockLotRepo.create).toHaveBeenCalledTimes(1);
      expect(inventoryRepo.create).toHaveBeenCalled();
      expect(productRepo.update).toHaveBeenCalledWith({
        id: baseStockInDto.productId,
        update: { stockQuantity: 150 },
      });
      expect(result.transaction.newStock).toBe(150);
      expect(result.transaction.quantity).toBe(50);
      expect(result.lots).toHaveLength(1);
    });

    it('should sum quantities across multiple lots', async () => {
      const multiLotDto = {
        ...baseStockInDto,
        lots: [
          { quantity: 30, expirationDate: '2027-01-01' },
          { quantity: 20, expirationDate: '2027-06-01' },
        ],
      };

      productRepo.findById.mockResolvedValue(mockProduct as any);
      stockLotRepo.create
        .mockResolvedValueOnce({ _id: new Types.ObjectId(), quantity: 30 } as any)
        .mockResolvedValueOnce({ _id: new Types.ObjectId(), quantity: 20 } as any);

      inventoryRepo.create.mockImplementation(({ doc }: any) =>
        Promise.resolve(doc),
      );
      productRepo.update.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 150,
      } as any);

      const result = await service.stockIn(multiLotDto as any);

      expect(stockLotRepo.create).toHaveBeenCalledTimes(2);
      expect(result.transaction.quantity).toBe(50);
      expect(result.transaction.newStock).toBe(150);
      expect(productRepo.update).toHaveBeenCalledWith({
        id: multiLotDto.productId,
        update: { stockQuantity: 150 },
      });
    });

    it('should generate a lot number when none is provided', async () => {
      productRepo.findById.mockResolvedValue(mockProduct as any);
      stockLotRepo.create.mockImplementation(({ doc }: any) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...doc }),
      );
      inventoryRepo.create.mockImplementation(({ doc }: any) =>
        Promise.resolve(doc),
      );
      productRepo.update.mockResolvedValue(mockProduct as any);

      await service.stockIn(baseStockInDto as any);

      const createArgs = stockLotRepo.create.mock.calls[0][0];
      expect(createArgs.doc.lotNumber).toMatch(/^LOT-\d{8}-[A-Z0-9]{4}-1$/);
    });

    it('should use the provided lot number when given', async () => {
      const dtoWithLotNumber = {
        ...baseStockInDto,
        lots: [
          {
            quantity: 50,
            expirationDate: '2027-01-01',
            lotNumber: 'CUSTOM-LOT-001',
          },
        ],
      };

      productRepo.findById.mockResolvedValue(mockProduct as any);
      stockLotRepo.create.mockImplementation(({ doc }: any) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...doc }),
      );
      inventoryRepo.create.mockImplementation(({ doc }: any) =>
        Promise.resolve(doc),
      );
      productRepo.update.mockResolvedValue(mockProduct as any);

      await service.stockIn(dtoWithLotNumber as any);

      const createArgs = stockLotRepo.create.mock.calls[0][0];
      expect(createArgs.doc.lotNumber).toBe('CUSTOM-LOT-001');
    });

    it('should throw NotFoundException when product not found', async () => {
      productRepo.findById.mockResolvedValue(null);

      await expect(service.stockIn(baseStockInDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when stock tracking is disabled', async () => {
      productRepo.findById.mockResolvedValue({
        ...mockProduct,
        trackStock: false,
      } as any);

      await expect(service.stockIn(baseStockInDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no lots are provided', async () => {
      productRepo.findById.mockResolvedValue(mockProduct as any);

      const dtoWithoutLots = { ...baseStockInDto, lots: [] };

      await expect(service.stockIn(dtoWithoutLots as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when total quantity is 0 or less', async () => {
      productRepo.findById.mockResolvedValue(mockProduct as any);

      const dtoWithZeroQuantity = {
        ...baseStockInDto,
        lots: [{ quantity: 0, expirationDate: '2027-01-01' }],
      };

      await expect(
        service.stockIn(dtoWithZeroQuantity as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a lot expiration date is before or equal to the reception date', async () => {
      productRepo.findById.mockResolvedValue(mockProduct as any);

      const dtoWithBadExpiration = {
        ...baseStockInDto,
        receptionDate: '2027-01-01',
        lots: [{ quantity: 50, expirationDate: '2026-01-01' }],
      };

      await expect(
        service.stockIn(dtoWithBadExpiration as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('stockOut', () => {
    it('should remove stock successfully', async () => {
      const stockOutDto = {
        productId: '507f1f77bcf86cd799439011',
        quantity: 30,
        reason: 'Sale',
      };

      productRepo.findById.mockResolvedValue(mockProduct as any);
      const transaction = {
        product: mockProduct._id,
        type: 'out',
        quantity: 30,
        previousStock: 100,
        newStock: 70,
        reason: 'Sale',
        team: mockProduct.team,
      };
      inventoryRepo.create.mockResolvedValue(transaction as any);
      productRepo.update.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 70,
      } as any);

      const result = await service.stockOut(stockOutDto);

      expect(productRepo.findById).toHaveBeenCalledWith({
        id: stockOutDto.productId,
      });
      expect(inventoryRepo.create).toHaveBeenCalled();
      expect(productRepo.update).toHaveBeenCalledWith({
        id: stockOutDto.productId,
        update: { stockQuantity: 70 },
      });
      expect(result.quantity).toBe(30);
      expect(result.newStock).toBe(70);
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const stockOutDto = {
        productId: '507f1f77bcf86cd799439011',
        quantity: 150,
      };

      productRepo.findById.mockResolvedValue(mockProduct as any);

      await expect(service.stockOut(stockOutDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock successfully', async () => {
      const adjustmentDto = {
        productId: '507f1f77bcf86cd799439011',
        newQuantity: 80,
        reason: 'Inventory count correction',
      };

      productRepo.findById.mockResolvedValue(mockProduct as any);
      const transaction = {
        product: mockProduct._id,
        type: 'adjustment',
        quantity: 20,
        previousStock: 100,
        newStock: 80,
        reason: 'Inventory count correction',
        team: mockProduct.team,
      };
      inventoryRepo.create.mockResolvedValue(transaction as any);
      productRepo.update.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 80,
      } as any);

      const result = await service.adjustStock(adjustmentDto);

      expect(productRepo.findById).toHaveBeenCalledWith({
        id: adjustmentDto.productId,
      });
      expect(inventoryRepo.create).toHaveBeenCalled();
      expect(productRepo.update).toHaveBeenCalledWith({
        id: adjustmentDto.productId,
        update: { stockQuantity: 80 },
      });
      expect(result.newStock).toBe(80);
    });
  });

  describe('getProductStock', () => {
    it('should return product stock information', async () => {
      productRepo.findById.mockResolvedValue(mockProduct as any);

      const result = await service.getProductStock('507f1f77bcf86cd799439011');

      expect(result.productId).toBe('507f1f77bcf86cd799439011');
      expect(result.stockQuantity).toBe(100);
      expect(result.lowStockThreshold).toBe(10);
      expect(result.trackStock).toBe(true);
      expect(result.isLowStock).toBe(false);
    });

    it('should indicate low stock when threshold is reached', async () => {
      const lowStockProduct = {
        ...mockProduct,
        stockQuantity: 5,
        lowStockThreshold: 10,
      };
      productRepo.findById.mockResolvedValue(lowStockProduct as any);

      const result = await service.getProductStock('507f1f77bcf86cd799439011');

      expect(result.isLowStock).toBe(true);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      const query = {
        productId: '507f1f77bcf86cd799439011',
        type: 'in' as const,
      };

      const transactions = [
        {
          product: mockProduct._id,
          type: 'in',
          quantity: 50,
          previousStock: 100,
          newStock: 150,
        },
      ];
      inventoryRepo.findAll.mockResolvedValue(transactions as any);

      const result = await service.getTransactionHistory(query);

      expect(inventoryRepo.findAll).toHaveBeenCalled();
      expect(result).toEqual(transactions);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const lowStockProducts = [
        {
          ...mockProduct,
          stockQuantity: 5,
          lowStockThreshold: 10,
        },
      ];
      productRepo.findAll.mockResolvedValue(lowStockProducts as any);

      const result = await service.getLowStockProducts();

      expect(productRepo.findAll).toHaveBeenCalled();
      expect(result).toEqual(lowStockProducts);
    });
  });
});