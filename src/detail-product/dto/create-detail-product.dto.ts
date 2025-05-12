import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDetailProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  composition?: string;

  @IsOptional()
  @IsString()
  form?: string;

  @IsOptional()
  @IsString()
  indications?: string;

  @IsOptional()
  @IsString()
  contraindications?: string;

  @IsOptional()
  @IsString()
  sideEffects?: string;

  @IsOptional()
  @IsString()
  precautions?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: Date;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsBoolean()
  isRepackaged?: boolean;
}
