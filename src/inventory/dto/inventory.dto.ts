import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Réception fournisseur — un lot = une quantité + sa date de péremption ──

export class StockLotDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsDateString()
  expirationDate: string;

  @IsOptional()
  @IsString()
  lotNumber?: string; // auto-généré si absent
}

export class StockInDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsString()
  supplier: string;

  @IsNotEmpty()
  @IsDateString()
  receptionDate: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockLotDto)
  lots: StockLotDto[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class StockOutDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class StockAdjustmentDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  newQuantity: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class QueryInventoryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  type?: 'in' | 'out' | 'adjustment';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class BulkUpdateItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  newQuantity: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class BulkUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates: BulkUpdateItemDto[];

  @IsOptional()
  @IsString()
  batchReason?: string;

  @IsNotEmpty()
  @IsString()
  performedBy: string;
}
