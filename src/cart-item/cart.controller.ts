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

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
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
  async updateQuantity(
    @Req() req: Request,
    @Query('productId') productId: string,
    @Body('quantity') quantity: number,
  ) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    if (!productId) throw new BadRequestException('productId manquant');
    return this.cartService.updateItemQuantity(sessionId, productId, quantity);
  }

  // DELETE /cart/remove?productId=xxx
  @Delete('remove')
  async remove(
    @Req() req: Request,
    @Query('productId') productId: string,
  ) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    if (!productId) throw new BadRequestException('productId manquant');
    return this.cartService.deleteItem(sessionId, productId);
  }

  @Delete('clear')
  async clearCart(@Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    return this.cartService.clearCart(sessionId);
  }
}
