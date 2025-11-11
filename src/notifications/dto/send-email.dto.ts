import {
  IsEmail,
  IsString,
  IsOptional,
  IsObject,
  IsArray,
} from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { each: true })
  to: string | string[];

  @IsString()
  subject: string;

  @IsString()
  @IsOptional()
  template?: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @IsString()
  @IsOptional()
  html?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsArray()
  @IsOptional()
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}
