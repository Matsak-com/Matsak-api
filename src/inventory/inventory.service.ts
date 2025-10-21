import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ERRORS } from '../common/errors';
import { InventoryRepository } from './inventory.repository';
import { ProductRepository } from '../product/product.repository';
import { InventoryTransaction } from './inventory.schema';
import {
  StockInDto,
  StockOutDto,
  StockAdjustmentDto,
  QueryInventoryDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  async stockIn(
    stockInDto: StockInDto,
    userId?: string,
  ): Promise<InventoryTransaction> {
    const product = await this.productRepo.findById({
      id: stockInDto.productId,
    });

    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    if (!product.trackStock) {
      throw new BadRequestException(ERRORS.STOCK_NOT_TRACKED);
    }

    const previousStock = product.stockQuantity || 0;
    const newStock = previousStock + stockInDto.quantity;

    // Create inventory transaction
    const transaction = await this.inventoryRepo.create({
      doc: {
        product: new Types.ObjectId(stockInDto.productId),
        type: 'in',
        quantity: stockInDto.quantity,
        previousStock,
        newStock,
        reason: stockInDto.reason,
        reference: stockInDto.reference,
        performedBy: userId ? new Types.ObjectId(userId) : undefined,
        team: product.team,
      },
    });

    // Update product stock
    await this.productRepo.update({
      id: stockInDto.productId,
      update: { stockQuantity: newStock },
    });

    return transaction;
  }

  async stockOut(
    stockOutDto: StockOutDto,
    userId?: string,
  ): Promise<InventoryTransaction> {
    const product = await this.productRepo.findById({
      id: stockOutDto.productId,
    });

    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    if (!product.trackStock) {
      throw new BadRequestException(ERRORS.STOCK_NOT_TRACKED);
    }

    const previousStock = product.stockQuantity || 0;

    if (previousStock < stockOutDto.quantity) {
      throw new BadRequestException(ERRORS.INSUFFICIENT_STOCK);
    }

    const newStock = previousStock - stockOutDto.quantity;

    // Create inventory transaction
    const transaction = await this.inventoryRepo.create({
      doc: {
        product: new Types.ObjectId(stockOutDto.productId),
        type: 'out',
        quantity: stockOutDto.quantity,
        previousStock,
        newStock,
        reason: stockOutDto.reason,
        reference: stockOutDto.reference,
        performedBy: userId ? new Types.ObjectId(userId) : undefined,
        team: product.team,
      },
    });

    // Update product stock
    await this.productRepo.update({
      id: stockOutDto.productId,
      update: { stockQuantity: newStock },
    });

    return transaction;
  }

  async adjustStock(
    adjustmentDto: StockAdjustmentDto,
    userId?: string,
  ): Promise<InventoryTransaction> {
    const product = await this.productRepo.findById({
      id: adjustmentDto.productId,
    });

    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    if (!product.trackStock) {
      throw new BadRequestException(ERRORS.STOCK_NOT_TRACKED);
    }

    const previousStock = product.stockQuantity || 0;
    const newStock = adjustmentDto.newQuantity;
    const difference = newStock - previousStock;

    // Create inventory transaction
    const transaction = await this.inventoryRepo.create({
      doc: {
        product: new Types.ObjectId(adjustmentDto.productId),
        type: 'adjustment',
        quantity: Math.abs(difference),
        previousStock,
        newStock,
        reason: adjustmentDto.reason || 'Stock adjustment',
        reference: adjustmentDto.reference,
        performedBy: userId ? new Types.ObjectId(userId) : undefined,
        team: product.team,
      },
    });

    // Update product stock
    await this.productRepo.update({
      id: adjustmentDto.productId,
      update: { stockQuantity: newStock },
    });

    return transaction;
  }

  async getProductStock(productId: string) {
    const product = await this.productRepo.findById({ id: productId });

    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    const isLowStock =
      product.trackStock &&
      product.lowStockThreshold > 0 &&
      product.stockQuantity <= product.lowStockThreshold;

    return {
      productId,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      trackStock: product.trackStock,
      isLowStock,
    };
  }

  async getTransactionHistory(query: QueryInventoryDto) {
    const filter: any = {};

    if (query.productId) {
      filter.product = new Types.ObjectId(query.productId);
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    return this.inventoryRepo.findAll({
      filter,
      options: {
        populate: ['product', 'performedBy'],
        sort: { createdAt: -1 },
      },
    });
  }

  async getLowStockProducts(teamId?: string) {
    const filter: any = {
      trackStock: true,
      $expr: {
        $and: [
          { $gt: ['$lowStockThreshold', 0] },
          { $lte: ['$stockQuantity', '$lowStockThreshold'] },
        ],
      },
    };

    if (teamId) {
      filter.team = new Types.ObjectId(teamId);
    }

    return this.productRepo.findAll({
      filter,
      options: {
        populate: ['detail', 'images'],
      },
    });
  }
}
