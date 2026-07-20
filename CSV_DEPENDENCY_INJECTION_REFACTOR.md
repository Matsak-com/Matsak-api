/**
 * OPTIONNEL: Refactoriser ProductCsvService pour utiliser l'injection de dépendances NestJS
 * 
 * Actuellement, ProductService instancie ProductCsvService directement.
 * Cette approche montre comment utiliser une meilleure pratique avec l'injection de dépendances.
 */

// ============================================================================
// APPROCHE ACTUELLE (Fonctionnelle mais non-idéale)
// ============================================================================

// Dans product.service.ts
import { Injectable } from '@nestjs/common';
import { ProductCsvService } from './csv/product-csv.service';

@Injectable()
export class ProductService {
  constructor(private readonly productRepo: ProductRepository) {}

  async bulkImportFromCSV(csvBuffer: Buffer, teamId: string) {
    // Instanciation dynamique (non-idéale)
    const csvService = new ProductCsvService();
    
    const records = await csvService.parseCSV(csvBuffer);
    // ... reste du code
  }
}

// ============================================================================
// APPROCHE RECOMMANDÉE (Meilleure pratique avec NestJS)
// ============================================================================

// ÉTAPE 1: Mettre à jour product.service.ts pour injecter ProductCsvService

import { Injectable, BadRequestException } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { ProductCsvService } from './csv/product-csv.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly csvService: ProductCsvService, // ✓ INJECTER ICI
  ) {}

  async bulkImportFromCSV(
    csvBuffer: Buffer,
    teamId: string,
    skipOnError = false,
  ) {
    try {
      // Utiliser le service injecté
      const records = await this.csvService.parseCSV(csvBuffer);
      
      if (records.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      let successfulProducts = [];
      let failed = 0;
      let errors = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const validation = this.csvService.validateProductRecord(
          record,
          i + 2,
        );

        if (!validation.valid) {
          failed++;
          errors.push({
            row: i + 2,
            errors: validation.errors,
          });

          if (!skipOnError) {
            break;
          }
          continue;
        }

        try {
          const payload =
            this.csvService.recordToProductPayload(record, teamId);
          const product = await this.createProduct(payload);
          successfulProducts.push(product);
        } catch (err) {
          failed++;
          errors.push({
            row: i + 2,
            errors: [err.message || 'Failed to create product'],
          });

          if (!skipOnError) {
            throw err;
          }
        }
      }

      return {
        total: records.length,
        successful: successfulProducts.length,
        failed,
        errors: errors.slice(0, 100), // Limit to 100 errors
        successfulProducts: successfulProducts.map((p) => ({
          id: p._id,
          name: p.detailData?.name,
          basePrice: p.basePrice,
        })),
      };
    } catch (error) {
      throw error;
    }
  }

  async bulkExportToCSV(
    teamId: string,
    includeImages = false,
    includeDiscounts = false,
  ): Promise<Buffer> {
    const products = await this.productRepo.findAll({
      teamId,
      deleted_at: null,
    });

    if (!products || products.length === 0) {
      return this.csvService.exportToCSV([], {
        teamId,
        includeImages,
        includeDiscounts,
      });
    }

    return this.csvService.exportToCSV(products, {
      teamId,
      includeImages,
      includeDiscounts,
    });
  }

  getCSVTemplate(): Buffer {
    return this.csvService.getCSVTemplate();
  }
}

// ============================================================================
// ÉTAPE 2: Mettre à jour product.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.schema';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { ProductCsvService } from './csv/product-csv.service'; // ✓ IMPORTER
import { DetailProductModule } from '../detail-product/detail-product.module';
import { ImageProductModule } from '../image-product/image-product.module';
import { MembersModule } from '../members/members.module';
import { SearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    SearchModule,
    DetailProductModule,
    ImageProductModule,
    MembersModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductRepository,
    ProductCsvService, // ✓ AJOUTER ICI
  ],
  exports: [
    ProductService,
    ProductRepository,
    ProductCsvService, // ✓ EXPORTER ICI
  ],
})
export class ProductModule {}

// ============================================================================
// ÉTAPE 3: Vérifier que ProductCsvService est un @Injectable()
// ============================================================================

// Dans product-csv.service.ts, vérifier que le décorateur est présent:

import { Injectable, BadRequestException } from '@nestjs/common';
import * as Papa from 'papaparse';
import { stringify } from 'csv-stringify/sync';

@Injectable() // ✓ IMPORTANT: Ce décorateur doit être présent
export class ProductCsvService {
  // ... reste du code
}

// ============================================================================
// COMPARAISON: Avant vs Après
// ============================================================================

// AVANT (avec instanciation directe):
// ✗ ProductCsvService n'est pas managé par NestJS
// ✗ Pas d'injection de dépendances
// ✗ Difficile à tester (mock)
// ✗ Peut créer des instances multiples

async bulkImportFromCSV_AVANT(csvBuffer: Buffer, teamId: string) {
  const csvService = new ProductCsvService(); // ✗ Instance directe
  const records = await csvService.parseCSV(csvBuffer);
}

// APRÈS (avec injection de dépendances):
// ✓ ProductCsvService managé par NestJS
// ✓ Instance singleton
// ✓ Facile à tester avec mocks
// ✓ Suit les bonnes pratiques NestJS

async bulkImportFromCSV_APRES(csvBuffer: Buffer, teamId: string) {
  // this.csvService est injecté dans le constructeur
  const records = await this.csvService.parseCSV(csvBuffer);
}

// ============================================================================
// TESTS AVEC MOCK (après refactoring)
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { ProductCsvService } from './csv/product-csv.service';
import { ProductRepository } from './product.repository';

describe('ProductService with DI', () => {
  let service: ProductService;
  let mockCsvService: jest.Mocked<ProductCsvService>;
  let mockRepository: jest.Mocked<ProductRepository>;

  beforeEach(async () => {
    // Créer des mocks
    mockCsvService = {
      parseCSV: jest.fn(),
      validateProductRecord: jest.fn(),
      recordToProductPayload: jest.fn(),
      exportToCSV: jest.fn(),
      getCSVTemplate: jest.fn(),
      productToCSVRecord: jest.fn(),
    } as any;

    mockRepository = {
      findAll: jest.fn(),
    } as any;

    // Créer le module de test avec les mocks
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductCsvService,
          useValue: mockCsvService,
        },
        {
          provide: ProductRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should use injected CSV service', async () => {
    const csvBuffer = Buffer.from('name,basePrice\nProduct,100');
    const mockRecords = [{ name: 'Product', basePrice: '100' }];

    mockCsvService.parseCSV.mockResolvedValue(mockRecords);
    mockCsvService.validateProductRecord.mockReturnValue({
      valid: true,
      errors: [],
    });
    mockCsvService.recordToProductPayload.mockReturnValue({
      teamId: 'team123',
      basePrice: 100,
      // ...
    });

    // Appeler la méthode
    // await service.bulkImportFromCSV(csvBuffer, 'team123');

    // Vérifier que le service CSV a été utilisé
    expect(mockCsvService.parseCSV).toHaveBeenCalledWith(csvBuffer);
  });
});

// ============================================================================
// BÉNÉFICES DE LA REFACTORISATION
// ============================================================================

/**
 * 1. MEILLEURE TESTABILITÉ
 *    - Facile de créer des mocks de ProductCsvService
 *    - Teste ProductService en isolation
 *
 * 2. RÉUTILISABILITÉ
 *    - ProductCsvService peut être injecté dans d'autres services
 *    - Centralisé et maintenable
 *
 * 3. GESTION DU CYCLE DE VIE
 *    - NestJS gère l'initialisation et la destruction
 *    - Singleton par défaut (instance unique)
 *
 * 4. RESPECT DES BONNES PRATIQUES NESTJS
 *    - Suit le pattern d'injection de dépendances
 *    - Cohérent avec le reste du codebase
 *
 * 5. FACILITE LES AMÉLIORATIONS FUTURES
 *    - Possibilité d'ajouter un cache
 *    - Possibilité d'ajouter des intercepteurs
 *    - Possibilité de logger les opérations
 */

// ============================================================================
// PROCHAINES ÉTAPES
// ============================================================================

/**
 * 1. APPLIQUER LA REFACTORISATION
 *    - Modifier product.service.ts pour injecter ProductCsvService
 *    - Mettre à jour product.module.ts
 *    - Tester que tout fonctionne toujours
 *
 * 2. AJOUTER DES TESTS
 *    - Écrire des tests unitaires avec mocks
 *    - Écrire des tests d'intégration
 *
 * 3. DOCUMENTER
 *    - Mettre à jour la documentation
 *    - Ajouter des commentaires au code
 *
 * 4. DÉPLOYER
 *    - Commiter les changements
 *    - Déployer en staging
 *    - Tester avant production
 */
