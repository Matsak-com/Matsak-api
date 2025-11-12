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

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly index = 'products';
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

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
            properties: {
              basePrice: { type: 'float' },
              currency: { type: 'keyword' },
              discounts: { type: 'object' },
              team: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
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
                  composition: {
                    type: 'text',
                    analyzer: 'custom_analyzer',
                  },
                  form: { type: 'text' },
                  indications: {
                    type: 'text',
                    analyzer: 'custom_analyzer',
                  },
                  contraindications: { type: 'text' },
                  sideEffects: { type: 'text' },
                  precautions: { type: 'text' },
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
                properties: {
                  url: { type: 'keyword' },
                  alt: { type: 'text' },
                },
              },
            },
          },
        });
        this.logger.log(`Index "${this.index}" created successfully`);
      } else {
        this.logger.log(`Index "${this.index}" already exists`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create index: ${error.message}`,
        error.stack,
      );
    }
  }

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
      const images = product.images as any;

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
          team: product.team?.toString(),
          createdAt: (product as any).createdAt,
          updatedAt: (product as any).updatedAt,
          
          // Détails du produit
          detail: detail ? {
            _id: detail._id?.toString(),
            name: detail.name || '',
            description: detail.description || '',
            composition: detail.composition || '',
            form: detail.form || '',
            indications: detail.indications || '',
            contraindications: detail.contraindications || '',
            sideEffects: detail.sideEffects || '',
            precautions: detail.precautions || '',
            expirationDate: detail.expirationDate,
            manufacturer: detail.manufacturer || '',
            isRepackaged: detail.isRepackaged || false,
            category: detail.category ? {
              _id: detail.category._id?.toString(),
              name: detail.category.name,
            } : null,
            subcategory: detail.subcategory ? {
              _id: detail.subcategory._id?.toString(),
              name: detail.subcategory.name,
            } : null,
          } : null,
          
          // Images du produit
          images: images ? {
            _id: images._id?.toString(),
            name: images.name || '',
            mimeType: images.mimeType || '',
            altText: images.altText || '',
          } : null,
        },
      });

      this.logger.log(`Produit indexé : ${product._id}`);
    } catch (error) {
      this.logger.error(`Erreur d'indexation du produit ${product._id}`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to index product: ${(error as any).message}`
      );
    }
  }

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
                    'detail.composition',
                    'detail.manufacturer',
                    'detail.indications',
                  ],
                  type: 'best_fields',
                  fuzziness: 'AUTO',
                },
              },
              {
                multi_match: {
                  query: keyword,
                  fields: [
                    'detail.name^2',
                    'detail.description',
                  ],
                  type: 'phrase_prefix',
                },
              },
              {
                match: {
                  'detail.category.name': {
                    query: keyword,
                    boost: 1.5,
                  },
                },
              },
              {
                match: {
                  'detail.subcategory.name': {
                    query: keyword,
                    boost: 1.2,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      });

      const hits = (result as any).hits?.hits || [];

      // Retourne toutes les informations du produit
      return hits.map((hit: any) => ({
        _id: hit._id,
        score: hit._score,
        ...hit._source,
      }));
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
      
      this.logger.error(`Erreur suppression Elasticsearch : ${productId}`, error);
      throw new InternalServerErrorException(
        `Failed to remove product from index: ${(error as any).message}`
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
          batch.map(product => this.indexProduct(product))
        );
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
            const product = batch[idx];
            this.logger.error(
              `Échec de l'indexation du produit ${product._id}`,
              result.reason
            );
          }
        });
      }

      this.logger.log(
        `Reindexation terminée ! Succès: ${successCount}, Erreurs: ${errorCount}`
      );
    } catch (error) {
      this.logger.error('Erreur lors de la réindexation complète', error);
      throw new InternalServerErrorException(
        `Reindexing failed: ${(error as any).message}`
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
      
      this.logger.error('Erreur lors de la suppression de l\'index', error);
      throw new InternalServerErrorException(
        `Failed to clear index: ${(error as any).message}`
      );
    }
  }
}

