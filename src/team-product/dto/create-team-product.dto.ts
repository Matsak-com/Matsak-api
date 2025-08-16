import { IsNotEmpty, IsMongoId, IsNumber, Min } from 'class-validator';

export class CreateTeamProductDto {
  @IsNotEmpty()
  @IsMongoId()
  product: string;

  @IsNotEmpty()
  @IsMongoId()
  team: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stock: number;
}
