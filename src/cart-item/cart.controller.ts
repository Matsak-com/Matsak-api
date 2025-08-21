import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ZodValidation, CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import {
  addToCartSchema,
  updateCartQuantitySchema,
  productIdQuerySchema,
} from '../common/schemas/cart.schemas';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  @ZodValidation(addToCartSchema)
  async add(@Body() dto: AddToCartDto, @Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    return this.cartService.addToCart(sessionId, dto);
  }

  @Get()
  async get(@Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    return this.cartService.getCart(sessionId);
  }

  // PATCH /cart/update?productId=xxx
  @Patch('update')
  @CompoundZodValidation({
    query: productIdQuerySchema,
    body: updateCartQuantitySchema,
  })
  async updateQuantity(
    @Req() req: Request,
    @Query() query: { productId: string },
    @Body() body: { quantity: number },
  ) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    return this.cartService.updateItemQuantity(sessionId, query.productId, body.quantity);
  }

  // DELETE /cart/remove?productId=xxx
  @Delete('remove')
  @CompoundZodValidation({ query: productIdQuerySchema })
  async remove(
    @Req() req: Request,
    @Query() query: { productId: string },
  ) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    return this.cartService.deleteItem(sessionId, query.productId);
  }

  @Delete('clear')
  async clearCart(@Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    return this.cartService.clearCart(sessionId);
  }
}
