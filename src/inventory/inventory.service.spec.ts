import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ProductRepository } from '../product/product.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: jest.Mocked<InventoryRepository>;
  let productRepo: jest.Mocked<ProductRepository>;

  const mockProduct = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    stockQuantity: 100,
    lowStockThreshold: 10,
    trackStock: true,
    team: new Types.ObjectId('507f1f77bcf86cd799439012'),
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
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepo = module.get(InventoryRepository);
    productRepo = module.get(ProductRepository);
  });

  describe('stockIn', () => {
    it('should add stock successfully', async () => {
      const stockInDto = {
        productId: '507f1f77bcf86cd799439011',
        quantity: 50,
        reason: 'Purchase',
        reference: 'PO-123',
      };

      productRepo.findById.mockResolvedValue(mockProduct as any);
      const transaction = {
        product: mockProduct._id,
        type: 'in',
        quantity: 50,
        previousStock: 100,
        newStock: 150,
        reason: 'Purchase',
        reference: 'PO-123',
        team: mockProduct.team,
      };
      inventoryRepo.create.mockResolvedValue(transaction as any);
      productRepo.update.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 150,
      } as any);

      const result = await service.stockIn(stockInDto);

      expect(productRepo.findById).toHaveBeenCalledWith({
        id: stockInDto.productId,
      });
      expect(inventoryRepo.create).toHaveBeenCalled();
      expect(productRepo.update).toHaveBeenCalledWith({
        id: stockInDto.productId,
        update: { stockQuantity: 150 },
      });
      expect(result.quantity).toBe(50);
      expect(result.newStock).toBe(150);
    });

    it('should throw NotFoundException when product not found', async () => {
      const stockInDto = {
        productId: '507f1f77bcf86cd799439011',
        quantity: 50,
      };

      productRepo.findById.mockResolvedValue(null);

      await expect(service.stockIn(stockInDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when stock tracking is disabled', async () => {
      const stockInDto = {
        productId: '507f1f77bcf86cd799439011',
        quantity: 50,
      };

      productRepo.findById.mockResolvedValue({
        ...mockProduct,
        trackStock: false,
      } as any);

      await expect(service.stockIn(stockInDto)).rejects.toThrow(
        BadRequestException,
      );
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
