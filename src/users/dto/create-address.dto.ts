import {
  IsString,
  IsOptional,
  IsBoolean,
  Length,
  IsPhoneNumber,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @Length(2, 50)
  firstName: string;

  @IsString()
  @Length(2, 50)
  lastName: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  company?: string;

  @IsPhoneNumber(null, { message: 'Numéro de téléphone invalide' })
  phone: string;

  @IsString()
  @Length(5, 200)
  addressLine: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  deliveryNotes?: string;

  @IsString()
  @Length(2, 100)
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
