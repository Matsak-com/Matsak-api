import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as Papa from 'papaparse';
import { stringify } from 'csv-stringify/sync';
import { Types } from 'mongoose';

export interface CSVProductRecord {
  name: string;
  description: string;
  basePrice: string;
  currency?: string;
  categoryName?: string;
  subcategoryName?: string;
  sku?: string;
  barcode?: string;
  weight?: string;
  stockQuantity?: string;
  trackStock?: string;
  lowStockThreshold?: string;
  isActive?: string;
  discountType?: string;
  discountValue?: string;
  additionalInfo?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  [key: string]: string | undefined;
}

export interface BulkImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    data: CSVProductRecord;
    error: string;
  }>;
  successfulProducts: any[];
}

export interface BulkExportOptions {
  teamId: string;
  includeImages?: boolean;
  includeDiscounts?: boolean;
}

@Injectable()
export class ProductCsvService {
  private readonly logger = new Logger(ProductCsvService.name);

  /**
   * Parse CSV file buffer and return array of product records
   */
  parseCSV(buffer: Buffer): Promise<CSVProductRecord[]> {
    return new Promise((resolve, reject) => {
      const content = buffer.toString('utf-8');

      Papa.parse<CSVProductRecord>(content, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            reject(new BadRequestException('CSV file is empty'));
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(
            new BadRequestException(
              `CSV parsing error: ${error.message || 'Unknown error'}`,
            ),
          );
        },
      });
    });
  }

  /**
   * Validate a single product record from CSV
   */
  validateProductRecord(record: CSVProductRecord): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!record.name || record.name.trim() === '') {
      errors.push('Product name is required');
    }

    if (!record.basePrice || isNaN(parseFloat(record.basePrice))) {
      errors.push('Valid base price is required');
    }

    if (record.basePrice && parseFloat(record.basePrice) < 0) {
      errors.push('Base price cannot be negative');
    }

    // Optional numeric fields
    if (record.weight && isNaN(parseFloat(record.weight))) {
      errors.push('Weight must be a valid number');
    }

    if (
      record.stockQuantity &&
      (!Number.isInteger(parseFloat(record.stockQuantity)) ||
        parseFloat(record.stockQuantity) < 0)
    ) {
      errors.push('Stock quantity must be a non-negative integer');
    }

    if (
      record.lowStockThreshold &&
      (!Number.isInteger(parseFloat(record.lowStockThreshold)) ||
        parseFloat(record.lowStockThreshold) < 0)
    ) {
      errors.push('Low stock threshold must be a non-negative integer');
    }

    // Boolean fields
    if (
      record.trackStock &&
      !['true', 'false', '1', '0', 'yes', 'no'].includes(
        record.trackStock.toLowerCase(),
      )
    ) {
      errors.push('trackStock must be true or false');
    }

    if (
      record.isActive &&
      !['true', 'false', '1', '0', 'yes', 'no'].includes(
        record.isActive.toLowerCase(),
      )
    ) {
      errors.push('isActive must be true or false');
    }

    // Discount validation
    if (record.discountValue) {
      if (isNaN(parseFloat(record.discountValue))) {
        errors.push('Discount value must be a valid number');
      }
      if (parseFloat(record.discountValue) < 0) {
        errors.push('Discount value cannot be negative');
      }
      if (
        record.discountType &&
        !['percentage', 'fixed', 'bulk'].includes(record.discountType)
      ) {
        errors.push('Discount type must be: percentage, fixed, or bulk');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert CSV record to product creation payload
   */
  recordToProductPayload(
    record: CSVProductRecord,
    teamId: string,
    categoryId: Types.ObjectId, // ← nouveau paramètre
  ): any {
    const payload: any = {
      teamId,
      basePrice: parseFloat(record.basePrice),
      currency: record.currency || 'MGA',
      isActive: this.parseBoolean(record.isActive, true),
      detailData: {
        name: record.name.trim(),
        description: record.description?.trim() || '',
        team: teamId,
        category: categoryId, // ← ajouté, requis par le schéma
      },
    };

    // Champs directement sur DetailProduct (corrigé, plus sous advanceData)
    if (record.sku) {
      payload.detailData.sku = record.sku.trim();
    }

    if (record.barcode) {
      payload.detailData.barcode = record.barcode.trim();
    }

    if (record.weight) {
      payload.detailData.weight = parseFloat(record.weight);
    }

    if (record.additionalInfo) {
      payload.detailData.additionalInfo = record.additionalInfo.trim();
    }

    if (record.seoTitle || record.seoDescription || record.seoKeywords) {
      payload.detailData.seo = {
        title: record.seoTitle?.trim() || undefined,
        description: record.seoDescription?.trim() || undefined,
        keywords: record.seoKeywords?.trim() || undefined,
      };
    }

    // Stock management
    if (record.stockQuantity) {
      payload.stockQuantity = parseInt(record.stockQuantity, 10);
    }

    if (record.trackStock !== undefined) {
      payload.trackStock = this.parseBoolean(record.trackStock, true);
    }

    if (record.lowStockThreshold) {
      payload.lowStockThreshold = parseInt(record.lowStockThreshold, 10);
    }

    // Discount
    if (record.discountType && record.discountValue) {
      payload.discounts = [
        {
          type: record.discountType,
          value: parseFloat(record.discountValue),
          isActive: true,
        },
      ];
    }

    return payload;
  }
  /**
   * Convert product document to CSV record
   */
  productToCSVRecord(product: any, detail?: any): CSVProductRecord {
    return {
      name: detail?.name || '',
      description: detail?.description || '',
      basePrice: (product.basePrice || 0).toString(),
      currency: product.currency || 'MGA',
      categoryName: detail?.category?.name || '',
      subcategoryName: detail?.subcategory?.name || '',
      sku: detail?.sku || '', // ← corrigé
      barcode: detail?.barcode || '', // ← corrigé
      weight: detail?.weight ? detail.weight.toString() : '', // ← corrigé
      stockQuantity: (product.stockQuantity || 0).toString(),
      trackStock: (product.trackStock !== false).toString(),
      lowStockThreshold: (product.lowStockThreshold || 0).toString(),
      isActive: product.isActive ? 'true' : 'false',
      discountType: product.discounts?.[0]?.type || '',
      discountValue: product.discounts?.[0]?.value
        ? product.discounts[0].value.toString()
        : '',
      additionalInfo: detail?.additionalInfo || '', // ← corrigé
      seoTitle: detail?.seo?.title || '', // ← corrigé
      seoDescription: detail?.seo?.description || '', // ← corrigé
      seoKeywords: detail?.seo?.keywords || '', // ← corrigé
    };
  }

  /**
   * Export products to CSV format
   */
  async exportToCSV(products: any[]): Promise<Buffer> {
    try {
      const records: CSVProductRecord[] = products.map((product) =>
        this.productToCSVRecord(product, product.detail),
      );

      // Define CSV columns
      const columns = [
        'name',
        'description',
        'basePrice',
        'currency',
        'categoryName',
        'subcategoryName',
        'sku',
        'barcode',
        'weight',
        'stockQuantity',
        'trackStock',
        'lowStockThreshold',
        'isActive',
        'discountType',
        'discountValue',
        'additionalInfo',
        'seoTitle',
        'seoDescription',
        'seoKeywords',
      ];

      const csv = stringify(records, {
        header: true,
        columns,
      });

      return Buffer.from(csv);
    } catch (error) {
      this.logger.error('CSV export failed', error);
      throw new BadRequestException('Failed to export products to CSV');
    }
  }

  /**
   * Get CSV template with headers and example data
   */
  getCSVTemplate(): Buffer {
    const templateData: CSVProductRecord[] = [
      {
        name: 'Example Product 1',
        description: 'Product description here',
        basePrice: '100',
        currency: 'MGA',
        categoryName: 'Electronics',
        subcategoryName: 'Phones',
        sku: 'SKU001',
        barcode: '1234567890',
        weight: '0.5',
        stockQuantity: '50',
        trackStock: 'true',
        lowStockThreshold: '10',
        isActive: 'true',
        discountType: 'percentage',
        discountValue: '10',
        additionalInfo: 'Additional info here',
        seoTitle: 'SEO Title',
        seoDescription: 'SEO Description',
        seoKeywords: 'keyword1, keyword2',
      },
    ];

    const columns = [
      'name',
      'description',
      'basePrice',
      'currency',
      'categoryName',
      'subcategoryName',
      'sku',
      'barcode',
      'weight',
      'stockQuantity',
      'trackStock',
      'lowStockThreshold',
      'isActive',
      'discountType',
      'discountValue',
      'additionalInfo',
      'seoTitle',
      'seoDescription',
      'seoKeywords',
    ];

    const csv = stringify(templateData, {
      header: true,
      columns,
    });

    return Buffer.from(csv);
  }

  /**
   * Helper to parse boolean values
   */
  private parseBoolean(
    value: string | undefined,
    defaultValue: boolean = false,
  ): boolean {
    if (!value) return defaultValue;
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }
}
