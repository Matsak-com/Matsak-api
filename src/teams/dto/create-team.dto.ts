import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  additional_address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsOptional()
  coordinates?: { lat: number; lng: number };

  @IsString()
  @IsOptional()
  logoUrl?: Express.Multer.File;

  @IsString()
  @IsNotEmpty()
  language: string;
}
