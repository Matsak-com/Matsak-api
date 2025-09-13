import { IsString, IsOptional } from 'class-validator';

export class CreateImageProductDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  altText?: string;
}
