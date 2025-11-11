import { IsString } from 'class-validator';

export class SendSmsDto {
  @IsString({ each: true })
  to: string | string[];

  @IsString()
  message: string;
}
