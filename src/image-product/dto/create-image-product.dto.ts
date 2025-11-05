import { IsString } from 'class-validator';

export class CreateImageProductDto {
  @IsString()
  filename: string;
}
