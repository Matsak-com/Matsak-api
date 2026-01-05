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
import { ERRORS } from '../common/errors';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import {
  ZodValidation,
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import {
  addToCartSchema,
  updateCartQuantitySchema,
  productIdQuerySchema,
} from '../common/schemas/cart.schemas';
import { Request } from 'express';
import { Types } from 'mongoose';

interface CartRequest extends Request {
  headers: {
    'x-user-id'?: string;
  };
}

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // 🔹 Méthode utilitaire pour extraire sessionId et userId
  private getCartIdentifiers(req: CartRequest) {
    const sessionId = req.cookies?.sessionId;
    const userIdFromHeader = req.headers['x-user-id'];

    console.log('🔍 getCartIdentifiers - sessionId:', sessionId);
    console.log('🔍 getCartIdentifiers - x-user-id:', userIdFromHeader);

    // PRIORITÉ 1: userId depuis le header (envoyé par le client depuis localStorage)
    if (userIdFromHeader && Types.ObjectId.isValid(userIdFromHeader)) {
      console.log('✅ Utilisation userId:', userIdFromHeader);
      return { 
        sessionId: undefined,
        userId: new Types.ObjectId(userIdFromHeader)
      };
    }

    // PRIORITÉ 2: sessionId depuis les cookies
    if (sessionId) {
      console.log('✅ Utilisation sessionId:', sessionId);
      return { 
        sessionId, 
        userId: undefined 
      };
    }

    console.error('❌ Aucun identifiant trouvé');
    throw new BadRequestException(ERRORS.SESSION_ID_MISSING);
  }

  @Get()
  async get(@Req() req: CartRequest) {
    console.log('📥 GET /cart');
    
    const { sessionId, userId } = this.getCartIdentifiers(req);
    console.log('🔍 Recherche panier avec:', { 
      sessionId, 
      userId: userId?.toString() 
    });
    
    const result = await this.cartService.getCart(sessionId, userId);
    console.log('📦 Panier trouvé avec', result.items?.length, 'items');

    return result;
  }

  @Post('add')
  @ZodValidation(addToCartSchema)
  async add(@Body() dto: AddToCartDto, @Req() req: CartRequest) {
    console.log('📥 POST /cart/add');
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.addToCart(dto, sessionId, userId);
  }

  @Post('merge')
  async mergeCart(@Req() req: CartRequest) {
    console.log('📥 POST /cart/merge - Fusion des paniers');
    
    const sessionId = req.cookies?.sessionId;
    const userIdFromHeader = req.headers['x-user-id'];

    // Pas de sessionId ? Rien à fusionner
    if (!sessionId) {
      console.log('⚠️ Pas de sessionId, fusion ignorée');
      return { items: [] };
    }

    // Vérifier userId valide
    if (!userIdFromHeader || !Types.ObjectId.isValid(userIdFromHeader)) {
      throw new BadRequestException('userId invalide pour la fusion');
    }

    const userId = new Types.ObjectId(userIdFromHeader);
    console.log('🔀 Fusion: sessionId', sessionId, '→ userId', userId.toString());

    // Effectuer la fusion
    const mergedCart = await this.cartService.mergeSessionCartToUser(sessionId, userId);
    
    if (mergedCart) {
      console.log('✅ Fusion réussie, panier contient', mergedCart.items.length, 'items');
      // Enrichir les items avant de retourner
      const enrichedItems = await this.cartService.getCart(undefined, userId);
      return enrichedItems;
    }

    console.log('ℹ️ Aucun panier session à fusionner');
    return { items: [] };
  }

  @Patch('update')
  @CompoundZodValidation({
    query: productIdQuerySchema,
    body: updateCartQuantitySchema,
  })
  async updateQuantity(
    @Req() req: CartRequest,
    @Query() query: { productId: string },
    @Body() body: { quantity: number },
  ) {
    console.log('📥 PATCH /cart/update');
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.updateItemQuantity(
      query.productId,
      body.quantity,
      sessionId,
      userId,
    );
  }

  @Delete('remove')
  @CompoundZodValidation({ query: productIdQuerySchema })
  async remove(@Req() req: CartRequest, @Query() query: { productId: string }) {
    console.log('📥 DELETE /cart/remove');
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.deleteItem(query.productId, sessionId, userId);
  }

  @Delete('clear')
  async clear(@Req() req: CartRequest) {
    console.log('📥 DELETE /cart/clear');
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.clearCart(sessionId, userId);
  }
}