import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export class DiscountDto {
  @IsNotEmpty()
  @IsEnum(['percentage', 'fixed', 'bulk'])
  type: 'percentage' | 'fixed' | 'bulk';

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number; // For bulk discounts
}

export class SetPriceDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class AddDiscountDto extends DiscountDto {}

export class UpdateDiscountDto {
  @IsOptional()
  @IsEnum(['percentage', 'fixed', 'bulk'])
  type?: 'percentage' | 'fixed' | 'bulk';

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number;
}

export class CalculatePriceDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsDateString()
  calculateAt?: string; // Calculate price at specific date
}