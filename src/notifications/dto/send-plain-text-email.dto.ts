import { IsEmail, IsString } from 'class-validator';

export class SendPlainTextEmailDto {
  @IsEmail({}, { each: true })
  to: string | string[];

  @IsString()
  subject: string;

  @IsString()
  text: string;
}
