import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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

  // Ajouter un produit au panier (en mémoire)
  @Post('add')
  async add(@Body() dto: AddToCartDto, @Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    return this.cartService.addToCart(sessionId, dto);
  }

  // Récupérer le panier pour la session
  @Get()
  async get(@Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    return this.cartService.getCart(sessionId);
  }

  // Modifier la quantité d'un produit dans le panier
  @Patch('update')
  async updateQuantity(
    @Req() req: Request,
    @Query('productId') productId: string,
    @Body('quantity') quantity: number,
  ) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    if (!productId) throw new BadRequestException('productId manquant');
    if (quantity == null || quantity < 1) {
      throw new BadRequestException('Quantité invalide');
    }

    return this.cartService.updateItemQuantity(sessionId, productId, quantity);
  }

  // Supprimer un produit du panier
  @Delete('remove')
  async remove(@Req() req: Request, @Query('productId') productId: string) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    if (!productId) throw new BadRequestException('productId manquant');
    return this.cartService.deleteItem(sessionId, productId);
  }

  // Vider le panier
  @Delete('clear')
  async clear(@Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    return this.cartService.clearCart(sessionId);
  }

  // Debug (voir le panier brut en mémoire)
  @Get('debug')
  async debug(@Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) throw new BadRequestException('Session ID manquant');
    return this.cartService.debugCart(sessionId);
  }
}
