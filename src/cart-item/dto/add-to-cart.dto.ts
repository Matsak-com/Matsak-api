// dto/add-to-cart.dto.ts
import { IsMongoId, IsInt, Min, IsOptional } from 'class-validator'

export class AddToCartDto {
  @IsMongoId()
  productId: string

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity: number
}
