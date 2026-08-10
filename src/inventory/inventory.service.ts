import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { ERRORS } from '../common/errors';
import { InventoryRepository } from './inventory.repository';
import { ProductRepository } from '../product/product.repository';
import { InventoryTransaction } from './inventory.schema';
import {
  StockInDto,
  StockOutDto,
  StockAdjustmentDto,
  QueryInventoryDto,
  BulkUpdateDto,
} from './dto/inventory.dto';
import { SearchService } from '../elasticsearch/elasticsearch.service';
import { StockLotRepository } from './stock-lot.repository'; // à créer si absent

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly inventoryRepo: InventoryRepository,
    private readonly productRepo: ProductRepository,
    private readonly searchService: SearchService,
    private readonly stockLotRepo: StockLotRepository,
  ) {}

  // ── Indexation non-bloquante — n'interrompt jamais le flux principal ──
  private async indexProductSafe(product: any): Promise<void> {
    try {
      await product.populate('detail images team');
      await this.searchService.indexProduct(product);
    } catch (error) {
      this.logger.warn(
        `Indexation échouée pour produit ${product._id} — non bloquant: ${error.message}`,
      );
    }
  }

  // ── Génère un numéro de lot si non fourni : LOT-YYYYMMDD-XXXX ──
  private generateLotNumber(index: number): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `LOT-${date}-${random}-${index}`;
  }

  /**
   * Entrée de stock — Réception fournisseur
   * Saisie lot par lot : chaque lot a sa propre quantité et date de péremption.
   * Le stock disponible du produit est incrémenté automatiquement
   * de la somme des quantités de tous les lots reçus.
   *
   * Toutes les écritures (lots + transaction + update produit) sont
   * exécutées dans une session Mongo transactionnelle : en cas d'échec
   * à n'importe quelle étape, tout est annulé (rollback automatique).
   */
  async stockIn(
    stockInDto: StockInDto,
    userId?: string,
  ): Promise<{
    transaction: InventoryTransaction;
    lots: any[];
  }> {
    const product = await this.productRepo.findById({
      id: stockInDto.productId,
    });

    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    if (!product.trackStock) {
      throw new BadRequestException(ERRORS.STOCK_NOT_TRACKED);
    }

    if (!stockInDto.lots || stockInDto.lots.length === 0) {
      throw new BadRequestException(
        'Au moins un lot est requis pour une réception fournisseur',
      );
    }

    const previousStock = product.stockQuantity || 0;

    // Quantité totale reçue = somme de tous les lots
    const totalQuantity = stockInDto.lots.reduce(
      (sum, lot) => sum + lot.quantity,
      0,
    );

    if (totalQuantity <= 0) {
      throw new BadRequestException(
        'La quantité totale reçue doit être supérieure à 0',
      );
    }

    const newStock = previousStock + totalQuantity;
    const receptionDate = new Date(stockInDto.receptionDate);

    // Validation des dates AVANT d'ouvrir la transaction (fail fast, pas de session à annuler pour une simple erreur de validation)
    for (let i = 0; i < stockInDto.lots.length; i++) {
      const expirationDate = new Date(stockInDto.lots[i].expirationDate);
      if (expirationDate <= receptionDate) {
        throw new BadRequestException(
          `La date de péremption du lot ${i + 1} doit être postérieure à la date de réception`,
        );
      }
    }

    const session = await this.connection.startSession();
    let createdLots: any[] = [];
    let transaction: any;

    try {
      await session.withTransaction(async () => {
        createdLots = [];

        // ── Création d'un lot en base pour chaque entrée saisie ──
        for (let i = 0; i < stockInDto.lots.length; i++) {
          const lotDto = stockInDto.lots[i];
          const expirationDate = new Date(lotDto.expirationDate);

          const lot = await this.stockLotRepo.create({
            doc: {
              product: new Types.ObjectId(stockInDto.productId),
              lotNumber: lotDto.lotNumber || this.generateLotNumber(i + 1),
              quantity: lotDto.quantity,
              initialQuantity: lotDto.quantity,
              supplier: stockInDto.supplier,
              receptionDate,
              expirationDate,
              team: product.team,
            },
            options: { session },
          });

          createdLots.push(lot);
        }

        // ── Transaction unique regroupant tous les lots de cette réception ──
        transaction = await this.inventoryRepo.create({
          doc: {
            product: new Types.ObjectId(stockInDto.productId),
            type: 'in',
            quantity: totalQuantity,
            previousStock,
            newStock,
            reason: stockInDto.reason || 'Réception fournisseur',
            reference: stockInDto.reference,
            supplier: stockInDto.supplier,
            receptionDate,
            lots: createdLots.map((lot) => lot._id),
            performedBy: userId ? new Types.ObjectId(userId) : undefined,
            team: product.team,
          },
          options: { session },
        });

        // ── Incrémentation automatique du stock disponible ──
        await this.productRepo.update({
          id: stockInDto.productId,
          update: { stockQuantity: newStock },
          options: { session },
        });
      });
    } catch (error) {
      this.logger.error(
        `Échec de la réception fournisseur pour produit ${stockInDto.productId}, rollback effectué: ${error.message}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }

    // Non-bloquant — exécuté seulement après commit réussi
    this.indexProductSafe(product);

    const populatedTransaction = await this.inventoryRepo.findById({
      id: transaction._id,
      options: {
        populate: [
          { path: 'product', populate: { path: 'detail', select: 'name sku' } },
        ],
      },
    });

    return { transaction: populatedTransaction, lots: createdLots };
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

    const session = await this.connection.startSession();
    let transaction: any;

    try {
      await session.withTransaction(async () => {
        transaction = await this.inventoryRepo.create({
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
          options: { session },
        });

        await this.productRepo.update({
          id: stockOutDto.productId,
          update: { stockQuantity: newStock },
          options: { session },
        });
      });
    } catch (error) {
      this.logger.error(
        `Échec de la sortie de stock pour produit ${stockOutDto.productId}, rollback effectué: ${error.message}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }

    // Non-bloquant
    this.indexProductSafe(product);

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

    const session = await this.connection.startSession();
    let transaction: any;

    try {
      await session.withTransaction(async () => {
        transaction = await this.inventoryRepo.create({
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
          options: { session },
        });

        await this.productRepo.update({
          id: adjustmentDto.productId,
          update: { stockQuantity: newStock },
          options: { session },
        });
      });
    } catch (error) {
      this.logger.error(
        `Échec de l'ajustement de stock pour produit ${adjustmentDto.productId}, rollback effectué: ${error.message}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }

    // Non-bloquant
    this.indexProductSafe(product);

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
        populate: [
          { path: 'product', populate: { path: 'detail', select: 'name sku' } },
          'performedBy',
        ],
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

  async bulkUpdateStock(bulkUpdateDto: BulkUpdateDto): Promise<{
    successful: any[];
    failed: any[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results = {
      successful: [],
      failed: [],
      summary: {
        total: bulkUpdateDto.updates.length,
        successful: 0,
        failed: 0,
      },
    };

    for (const update of bulkUpdateDto.updates) {
      const session = await this.connection.startSession();

      try {
        const product = await this.productRepo.findById({
          id: update.productId,
        });

        if (!product) {
          results.failed.push({
            productId: update.productId,
            error: 'Product not found',
            ...update,
          });
          results.summary.failed++;
          await session.endSession();
          continue;
        }

        if (!product.trackStock) {
          results.failed.push({
            productId: update.productId,
            error: 'Stock tracking not enabled for this product',
            ...update,
          });
          results.summary.failed++;
          await session.endSession();
          continue;
        }

        const previousStock = product.stockQuantity || 0;
        const newStock = update.newQuantity;
        const difference = newStock - previousStock;

        // Chaque item du bulk reste indépendant (un échec n'annule pas
        // les autres items), mais la paire create+update de CET item
        // est atomique grâce à la session.
        await session.withTransaction(async () => {
          await this.inventoryRepo.create({
            doc: {
              product: new Types.ObjectId(update.productId),
              type: 'adjustment',
              quantity: Math.abs(difference),
              previousStock,
              newStock,
              reason:
                update.reason ||
                bulkUpdateDto.batchReason ||
                'Bulk adjustment',
              reference: update.reference,
              performedBy: new Types.ObjectId(bulkUpdateDto.performedBy),
              team: product.team,
            },
            options: { session },
          });

          await this.productRepo.update({
            id: update.productId,
            update: { stockQuantity: newStock },
            options: { session },
          });
        });

        results.successful.push({
          productId: update.productId,
          previousStock,
          newStock,
          difference,
          ...update,
        });

        // Non-bloquant
        this.indexProductSafe(product);

        results.summary.successful++;
      } catch (error) {
        this.logger.error(
          `Échec du bulk update pour produit ${update.productId}, rollback effectué: ${error.message}`,
        );
        results.failed.push({
          productId: update.productId,
          error: error.message || 'Unknown error occurred',
          ...update,
        });
        results.summary.failed++;
      } finally {
        await session.endSession();
      }
    }

    return results;
  }
}