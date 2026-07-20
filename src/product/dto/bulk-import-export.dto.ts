import { IsMongoId, IsOptional, IsBoolean } from 'class-validator';

export class BulkImportProductsDto {
  @IsMongoId()
  teamId: string;

  @IsOptional()
  @IsBoolean()
  skipOnError?: boolean;
}

export class BulkExportProductsDto {
  @IsMongoId()
  teamId: string;

  @IsOptional()
  @IsBoolean()
  includeImages?: boolean;

  @IsOptional()
  @IsBoolean()
  includeDiscounts?: boolean;
}
