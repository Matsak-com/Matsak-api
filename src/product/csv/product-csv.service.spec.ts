/**
 * Tests pour les endpoints Bulk CSV Import/Export
 *
 * Exécutez avec: npm run test -- --testPathPattern=product-csv
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../product.service';
import { ProductCsvService } from '../csv/product-csv.service';

describe('Product CSV Bulk Operations', () => {
  let csvService: ProductCsvService;
  const mockTeamId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [ProductService, ProductCsvService],
    }).compile();

    csvService = moduleFixture.get<ProductCsvService>(ProductCsvService);
  });

  describe('ProductCsvService', () => {
    describe('parseCSV', () => {
      it('should parse valid CSV buffer', async () => {
        const csv = `name,description,basePrice,currency
Product 1,Description 1,100,MGA
Product 2,Description 2,200,USD`;
        const buffer = Buffer.from(csv);

        const records = await csvService.parseCSV(buffer);

        expect(records).toHaveLength(2);
        expect(records[0].name).toBe('Product 1');
        expect(records[0].basePrice).toBe('100');
      });

      it('should throw error for empty CSV', async () => {
        const csv = '';
        const buffer = Buffer.from(csv);

        await expect(csvService.parseCSV(buffer)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should handle CSV with special characters', async () => {
        const csv = `name,description,basePrice
"Product, Special",Description with "quotes",100
Product 2,Normal description,200`;
        const buffer = Buffer.from(csv);

        const records = await csvService.parseCSV(buffer);

        expect(records).toHaveLength(2);
        expect(records[0].name).toContain('Product');
      });
    });

    describe('validateProductRecord', () => {
      it('should validate correct record', () => {
        const record = {
          name: 'Test Product',
          description: 'Test',
          basePrice: '100',
          currency: 'MGA',
        };

        const result = csvService.validateProductRecord(record, 1);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject missing name', () => {
        const record = {
          name: '',
          basePrice: '100',
        };

        const result = csvService.validateProductRecord(record, 1);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Product name is required');
      });

      it('should reject invalid basePrice', () => {
        const record = {
          name: 'Test',
          basePrice: 'invalid',
        };

        const result = csvService.validateProductRecord(record, 1);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Valid base price is required');
      });

      it('should reject negative basePrice', () => {
        const record = {
          name: 'Test',
          basePrice: '-100',
        };

        const result = csvService.validateProductRecord(record, 1);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Base price cannot be negative');
      });

      it('should reject invalid stockQuantity', () => {
        const record = {
          name: 'Test',
          basePrice: '100',
          stockQuantity: '50.5',
        };

        const result = csvService.validateProductRecord(record, 1);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Stock quantity must be a non-negative integer',
        );
      });

      it('should reject invalid boolean fields', () => {
        const record = {
          name: 'Test',
          basePrice: '100',
          isActive: 'maybe',
        };

        const result = csvService.validateProductRecord(record, 1);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('isActive must be true or false');
      });

      it('should reject invalid discount type', () => {
        const record = {
          name: 'Test',
          basePrice: '100',
          discountType: 'invalid',
          discountValue: '10',
        };

        const result = csvService.validateProductRecord(record, 1);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Discount type must be: percentage, fixed, or bulk',
        );
      });

      it('should accept valid discount types', () => {
        const validTypes = ['percentage', 'fixed', 'bulk'];

        validTypes.forEach((type) => {
          const record = {
            name: 'Test',
            basePrice: '100',
            discountType: type,
            discountValue: '10',
          };

          const result = csvService.validateProductRecord(record, 1);

          expect(result.valid).toBe(true);
        });
      });
    });

    describe('recordToProductPayload', () => {
      it('should convert record to valid payload', () => {
        const record = {
          name: 'Test Product',
          description: 'Test Description',
          basePrice: '100',
          currency: 'MGA',
          sku: 'SKU001',
          stockQuantity: '50',
          isActive: 'true',
        };

        const payload = csvService.recordToProductPayload(record, mockTeamId);

        expect(payload.teamId).toBe(mockTeamId);
        expect(payload.basePrice).toBe(100);
        expect(payload.currency).toBe('MGA');
        expect(payload.detailData.name).toBe('Test Product');
        expect(payload.stockQuantity).toBe(50);
        expect(payload.isActive).toBe(true);
        expect(payload.advanceData.sku).toBe('SKU001');
      });

      it('should apply defaults for optional fields', () => {
        const record = {
          name: 'Test',
          basePrice: '100',
        };

        const payload = csvService.recordToProductPayload(record, mockTeamId);

        expect(payload.currency).toBe('MGA');
        expect(payload.isActive).toBe(true);
        expect(payload.advanceData).toBeDefined();
      });

      it('should handle SEO data', () => {
        const record = {
          name: 'Test',
          basePrice: '100',
          seoTitle: 'SEO Title',
          seoDescription: 'SEO Desc',
          seoKeywords: 'keyword1, keyword2',
        };

        const payload = csvService.recordToProductPayload(record, mockTeamId);

        expect(payload.advanceData.seo).toBeDefined();
        expect(payload.advanceData.seo.title).toBe('SEO Title');
        expect(payload.advanceData.seo.keywords).toBe('keyword1, keyword2');
      });

      it('should handle discount data', () => {
        const record = {
          name: 'Test',
          basePrice: '100',
          discountType: 'percentage',
          discountValue: '10',
        };

        const payload = csvService.recordToProductPayload(record, mockTeamId);

        expect(payload.discounts).toHaveLength(1);
        expect(payload.discounts[0].type).toBe('percentage');
        expect(payload.discounts[0].value).toBe(10);
      });
    });

    describe('getCSVTemplate', () => {
      it('should generate valid CSV template', () => {
        const template = csvService.getCSVTemplate();

        expect(template).toBeInstanceOf(Buffer);
        const content = template.toString();
        expect(content).toContain('name,description,basePrice');
        expect(content).toContain('Example Product 1');
      });
    });

    describe('exportToCSV', () => {
      it('should export products to CSV', async () => {
        const mockProducts = [
          {
            _id: '507f1f77bcf86cd799439011',
            basePrice: 100,
            currency: 'MGA',
            stockQuantity: 50,
            trackStock: true,
            lowStockThreshold: 10,
            isActive: true,
            discounts: [{ type: 'percentage', value: 10, isActive: true }],
          },
        ];

        const csv = await csvService.exportToCSV(mockProducts, {
          teamId: mockTeamId,
        });

        expect(csv).toBeInstanceOf(Buffer);
        const content = csv.toString();
        expect(content).toContain('100'); // price
        expect(content).toContain('50'); // stock
      });

      it('should handle empty product list', async () => {
        const csv = await csvService.exportToCSV([], {
          teamId: mockTeamId,
        });

        expect(csv).toBeInstanceOf(Buffer);
        const content = csv.toString();
        expect(content).toContain('name,description,basePrice');
      });
    });

    describe('productToCSVRecord', () => {
      it('should convert product to CSV record', () => {
        const mockProduct = {
          basePrice: 100,
          currency: 'USD',
          stockQuantity: 50,
          trackStock: true,
          lowStockThreshold: 10,
          isActive: true,
          discounts: [{ type: 'percentage', value: 10 }],
        };

        const mockDetail = {
          name: 'Product Name',
          description: 'Product Desc',
          advanceData: {
            sku: 'SKU001',
            barcode: '123456',
            weight: 0.5,
            seo: {
              title: 'SEO Title',
              description: 'SEO Desc',
              keywords: 'keywords',
            },
          },
        };

        const record = csvService.productToCSVRecord(mockProduct, mockDetail);

        expect(record.name).toBe('Product Name');
        expect(record.basePrice).toBe('100');
        expect(record.stockQuantity).toBe('50');
        expect(record.sku).toBe('SKU001');
        expect(record.seoTitle).toBe('SEO Title');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle full import/export cycle', async () => {
      // 1. Generate template
      const template = csvService.getCSVTemplate();
      expect(template).toBeInstanceOf(Buffer);

      // 2. Parse template
      const records = await csvService.parseCSV(template);
      expect(records.length).toBeGreaterThan(0);

      // 3. Validate records
      const validation = csvService.validateProductRecord(records[0], 2);
      expect(validation.valid).toBe(true);

      // 4. Convert to payload
      const payload = csvService.recordToProductPayload(records[0], mockTeamId);
      expect(payload.teamId).toBe(mockTeamId);
    });

    it('should handle multiple validation errors', async () => {
      const invalidRecords = [
        { basePrice: 'invalid' }, // no name, invalid price
        { name: 'Product', basePrice: '-100' }, // negative price
        { name: '', basePrice: '100' }, // no name
      ];

      invalidRecords.forEach((record, index) => {
        const result = csvService.validateProductRecord(record, index);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});
