import { IsEmail, IsString } from 'class-validator';

export class SendHtmlEmailDto {
  @IsEmail({}, { each: true })
  to: string | string[];

  @IsString()
  subject: string;

  @IsString()
  html: string;
}
