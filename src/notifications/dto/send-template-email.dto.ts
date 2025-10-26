import { IsEmail, IsString, IsOptional, IsObject, IsIn } from 'class-validator';

export class SendTemplateEmailDto {
  @IsEmail({}, { each: true })
  to: string | string[];

  @IsString()
  subject: string;

  @IsString()
  template: string;

  @IsObject()
  context: Record<string, any>;

  @IsString()
  @IsOptional()
  @IsIn(['en', 'fr', 'zh', 'ar'])
  locale?: 'en' | 'fr' | 'zh' | 'ar';
}
