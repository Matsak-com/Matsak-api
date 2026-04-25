import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ProductDocument } from '../product/product.schema';
import { ERRORS } from '../common/errors';
import { ImageProductService } from '../image-product/image-product.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly index = 'products';
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly imageProductService: ImageProductService,
    private readonly teamsService: TeamsService,
  ) {}

  async onModuleInit() {
    await this.createIndexIfNotExists();
  }

  async createIndexIfNotExists() {
    try {
      const indexExists = await this.elasticsearchService.indices.exists({
        index: this.index,
      });

      if (!indexExists) {
        await this.elasticsearchService.indices.create({
          index: this.index,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                custom_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding'],
                },
              },
            },
          },
          mappings: {
            properties: this.getIndexMappings(),
          },
        });
        this.logger.log(`Index "${this.index}" created successfully`);
      } else {
        this.logger.log(
          `Index "${this.index}" already exists — applying mapping updates`,
        );
        await this.updateMappings();
      }
    } catch (error) {
      this.logger.error(
        `Failed to create index: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Returns the Elasticsearch field mappings for the products index.
   * Centralised so both create and put-mapping paths use the same definition.
   */
  private getIndexMappings() {
    return {
      basePrice: { type: 'float' },
      currency: { type: 'keyword' },
      discounts: { type: 'object' },
      team: { type: 'keyword' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      stockQuantity: { type: 'integer' },
      lowStockThreshold: { type: 'integer' },
      trackStock: { type: 'boolean' },
      detail: {
        properties: {
          _id: { type: 'keyword' },
          name: {
            type: 'text',
            analyzer: 'custom_analyzer',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          description: {
            type: 'text',
            analyzer: 'custom_analyzer',
          },
          genericName: {
            type: 'text',
            analyzer: 'custom_analyzer',
            fields: { keyword: { type: 'keyword' } },
          },
          dosageForm: { type: 'keyword' },
          strength: { type: 'text', analyzer: 'custom_analyzer' },
          routeOfAdministration: { type: 'keyword' },
          dosageInstructions: {
            type: 'text',
            analyzer: 'custom_analyzer',
          },
          therapeuticClass: { type: 'keyword' },
          pharmacologicalClass: { type: 'keyword' },
          contraindications: { type: 'text' },
          sideEffects: { type: 'text' },
          warningLabels: { type: 'text' },
          drugInteractions: { type: 'text' },
          prescriptionRequired: { type: 'boolean' },
          controlledSubstance: { type: 'boolean' },
          packagingType: { type: 'keyword' },
          atcCode: { type: 'keyword' },
          form: { type: 'text' },
          expirationDate: { type: 'date' },
          manufacturer: {
            type: 'text',
            analyzer: 'custom_analyzer',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          isRepackaged: { type: 'boolean' },
          sku: { type: 'keyword' },
          barcode: { type: 'keyword' },
          category: {
            properties: {
              _id: { type: 'keyword' },
              name: { type: 'text', analyzer: 'custom_analyzer' },
            },
          },
          subcategory: {
            properties: {
              _id: { type: 'keyword' },
              name: { type: 'text', analyzer: 'custom_analyzer' },
            },
          },
        },
      },
      images: {
        type: 'nested',
        properties: {
          _id: { type: 'keyword' },
          name: { type: 'text' },
          mimeType: { type: 'keyword' },
          altText: { type: 'text' },
          // Note: 'data' field (base64) is intentionally excluded to reduce index size
          // Image data can be retrieved from MongoDB using the _id reference
        },
      },
    };
  }

  /**
   * Update the mappings of an existing index by calling the put mapping API.
   * Existing fields are not affected; only new fields are added.
   */
  async updateMappings() {
    try {
      await this.elasticsearchService.indices.putMapping({
        index: this.index,
        properties: this.getIndexMappings(),
      });
      this.logger.log(`Mappings updated for index "${this.index}"`);
    } catch (error) {
      this.logger.error(
        `Failed to update mappings for index "${this.index}": ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Index a product in Elasticsearch for search
   *
   * @param product Product document to index
   *
   * @remarks
   * **Performance Optimization:** Only image metadata is indexed (not base64 data).
   * This keeps the index lightweight and search results fast.
   *
   * Indexed image fields:
   * - `_id` - Reference to fetch full data from MongoDB
   * - `name` - Filename
   * - `mimeType` - MIME type (e.g., 'image/jpeg')
   * - `altText` - Accessibility text
   *
   * Excluded fields:
   * - `data` - Base64 encoded image (retrieved from MongoDB when needed)
   * - `createdAt`, `updatedAt` - Timestamps (not needed for search)
   */
  async indexProduct(product: ProductDocument) {
    try {
      if (!product) {
        throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
      }

      if (product.deleted_at) {
        this.logger.warn(`Produit ignoré (supprimé) : ${product._id}`);
        await this.removeProduct(product._id.toString());
        return;
      }

      // Populate detail et images
      await product.populate('detail');
      await product.populate('images');

      const detail = product.detail as any;
      const images = product.images as any[];

      // Populate les références dans detail (category et subcategory)
      if (detail) {
        await detail.populate('category');
        await detail.populate('subcategory');
      }

      await this.elasticsearchService.index({
        index: this.index,
        id: product._id.toString(),
        document: {
          basePrice: product.basePrice,
          currency: product.currency,
          discounts: product.discounts || [],
          team:
            typeof product.team === 'object' && product.team?._id
              ? product.team._id.toString()
              : product.team?.toString(),
          createdAt: (product as any).createdAt,
          updatedAt: (product as any).updatedAt,
          stockQuantity: product.stockQuantity || 0,
          lowStockThreshold: product.lowStockThreshold || 0,
          trackStock:
            product.trackStock !== undefined ? product.trackStock : true,

          // Détails du produit
          detail: detail
            ? {
                _id: detail._id?.toString(),
                name: detail.name || '',
                description: detail.description || '',
                genericName: detail.genericName || '',
                atcCode: detail.atcCode || '',
                dosageForm: detail.dosageForm || '',
                strength: detail.strength || '',
                routeOfAdministration: detail.routeOfAdministration || '',
                dosageInstructions: detail.dosageInstructions || '',
                therapeuticClass: detail.therapeuticClass || '',
                pharmacologicalClass: detail.pharmacologicalClass || '',
                contraindications: detail.contraindications || '',
                sideEffects: detail.sideEffects || '',
                warningLabels: detail.warningLabels || [],
                drugInteractions: detail.drugInteractions || [],
                prescriptionRequired: detail.prescriptionRequired || false,
                controlledSubstance: detail.controlledSubstance || false,
                packagingType: detail.packagingType || '',
                form: detail.form || '',
                expirationDate: detail.expirationDate,
                manufacturer: detail.manufacturer || '',
                isRepackaged: detail.isRepackaged || false,
                category: detail.category
                  ? {
                      _id: detail.category._id?.toString(),
                      name: detail.category.name,
                    }
                  : null,
                subcategory: detail.subcategory
                  ? {
                      _id: detail.subcategory._id?.toString(),
                      name: detail.subcategory.name,
                    }
                  : null,
              }
            : null,

          // Images du produit (array) - Only metadata, not base64 data
          // Base64 data excluded to reduce index size and improve performance
          images:
            images && Array.isArray(images)
              ? images.map((img) => ({
                  _id: img._id?.toString(),
                  name: img.name || '',
                  mimeType: img.mimeType || '',
                  altText: img.altText || '',
                  // data field intentionally omitted - retrieve from MongoDB when needed
                }))
              : [],
        },
      });

      this.logger.log(`Produit indexé : ${product._id}`);
    } catch (error) {
      this.logger.error(`Erreur d'indexation du produit ${product._id}`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to index product: ${(error as any).message}`,
      );
    }
  }

  /**
   * Search for products using Elasticsearch
   *
   * @param keyword Search term
   * @returns Array of product search results with full image data populated from MongoDB
   *
   * @remarks
   * **Performance Optimization:** Elasticsearch index stores only image metadata (_id, name, mimeType, altText).
   * After search, full image data (including base64) is populated from MongoDB for each result.
   *
   * This approach provides:
   * - Fast search queries (lightweight Elasticsearch index)
   * - Complete image data in results (populated from MongoDB)
   *
   * @example
   * ```typescript
   * // Search returns complete results with full image data
   * const results = await searchService.searchProducts('aspirin');
   * // results[0].images = [{ _id: '...', data: 'base64...', name: 'image.jpg', mimeType: 'image/jpeg' }]
   * ```
   */
  async searchProducts(keyword: string) {
    try {
      if (!keyword || keyword.trim() === '') {
        this.logger.warn('Recherche avec mot-clé vide');
        return [];
      }

      const result = await this.elasticsearchService.search({
        index: this.index,
        query: {
          bool: {
            should: [
              {
                multi_match: {
                  query: keyword,
                  fields: [
                    'detail.name^3',
                    'detail.description^2',
                    'detail.genericName^2',
                    'detail.strength',
                    'detail.dosageInstructions',
                    'detail.manufacturer',
                  ],
                  type: 'best_fields',
                  fuzziness: 'AUTO',
                },
              },
              {
                multi_match: {
                  query: keyword,
                  fields: ['detail.name^2', 'detail.description'],
                  type: 'phrase_prefix',
                },
              },
              // reactivate when category search is needed
              // {
              //   match: {
              //     'detail.category.name': {
              //       query: keyword,
              //       boost: 1.5,
              //     },
              //   },
              // },
              // {
              //   match: {
              //     'detail.subcategory.name': {
              //       query: keyword,
              //       boost: 1.2,
              //     },
              //   },
              // },
            ],
            minimum_should_match: 1,
          },
        },
      });
      const hits = (result as any).hits?.hits || [];

      // Map search results
      const products = hits.map((hit: any) => ({
        _id: hit._id,
        score: hit._score,
        ...hit._source,
      }));

      const allImageIds = products.flatMap((p) =>
        (p.images || []).map((img) => img._id),
      );
      // Fetch all images in one query
      const allImages = await this.imageProductService.findMany(allImageIds);
      const imageMap = new Map(
        allImages.map((img) => [img._id.toString(), img]),
      );

      // Collect all team IDs
      const teamIds = products
        .map((p) => p.team)
        .filter((id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));
      // Fetch all teams in one query
      const allTeams = await this.teamsService.findMany(teamIds);
      const teamMap = new Map(
        (allTeams || []).map((team) => [team._id.toString(), team]),
      );

      // Map results back to products
      for (const product of products) {
        if (product.images) {
          product.images = product.images.map(
            (img) => imageMap.get(img._id) || img,
          );
        }
        if (product.team && teamMap.has(product.team)) {
          product.team = teamMap.get(product.team);
        }
      }

      return products;
    } catch (error) {
      this.logger.error('Erreur lors de la recherche Elasticsearch', error);
      throw new InternalServerErrorException(
        `Search failed: ${(error as any).message}`,
      );
    }
  }

  async removeProduct(productId: string) {
    try {
      if (!productId) {
        throw new BadRequestException(ERRORS.PRODUCT_ID_MISSING);
      }

      await this.elasticsearchService.delete({
        index: this.index,
        id: productId,
      });
      this.logger.log(`Produit supprimé de l'index : ${productId}`);
    } catch (error) {
      if ((error as any).meta?.statusCode === 404) {
        this.logger.warn(`Produit ${productId} non trouvé dans l'index`);
        // Ne pas throw ici car ce n'est pas critique si le produit n'existe pas déjà
        return;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Erreur suppression Elasticsearch : ${productId}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to remove product from index: ${(error as any).message}`,
      );
    }
  }

  async reindexAll(products: ProductDocument[]) {
    try {
      if (!products || products.length === 0) {
        this.logger.warn('Aucun produit à réindexer');
        return;
      }

      this.logger.log('Starting complete reindexing of products...');

      let successCount = 0;
      let errorCount = 0;

      const BATCH_SIZE = 20;
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((product) => this.indexProduct(product)),
        );
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
            const product = batch[idx];
            this.logger.error(
              `Échec de l'indexation du produit ${product._id}`,
              result.reason,
            );
          }
        });
      }

      this.logger.log(
        `Reindexation terminée ! Succès: ${successCount}, Erreurs: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Erreur lors de la réindexation complète', error);
      throw new InternalServerErrorException(
        `Reindexing failed: ${(error as any).message}`,
      );
    }
  }

  async clearIndex() {
    try {
      await this.elasticsearchService.indices.delete({ index: this.index });
      this.logger.warn(`Index "${this.index}" supprimé.`);
    } catch (error) {
      if ((error as any).meta?.statusCode === 404) {
        this.logger.warn(`L'index "${this.index}" n'existe pas encore.`);
        return;
      }

      this.logger.error("Erreur lors de la suppression de l'index", error);
      throw new InternalServerErrorException(
        `Failed to clear index: ${(error as any).message}`,
      );
    }
  }
}
