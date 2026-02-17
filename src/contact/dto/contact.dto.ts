import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';

export class ContactDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value.trim())
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value.trim())
  lastName: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{3} \d{2} \d{3} \d{2}$/, {
    message: 'Phone must be in format: xxx xx xxx xx',
  })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim().toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  @Transform(({ value }) =>
    sanitizeHtml(value.trim(), {
      allowedTags: [],
      allowedAttributes: {},
    }),
  )
  message: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  honeypot?: string;

  @IsString()
  @IsNotEmpty()
  turnstileToken: string;
}
