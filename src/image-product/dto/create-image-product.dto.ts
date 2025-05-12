import { IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateImageProductDto {
  @IsString()
  readonly url: string; 

  @IsString()
  readonly filename: string; 

  @IsOptional()
  @IsString()
  readonly altText?: string; 

  @IsEnum(['product', 'decond'])
  readonly type: 'product' | 'decond'; 
}
