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
import { ERRORS } from '../common/errors';

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

    // PRIORITÉ 1: userId depuis le header (envoyé par le client depuis localStorage)
    if (userIdFromHeader && Types.ObjectId.isValid(userIdFromHeader)) {
      return {
        sessionId: undefined,
        userId: new Types.ObjectId(userIdFromHeader),
      };
    }

    // PRIORITÉ 2: sessionId depuis les cookies
    if (sessionId) {
      return {
        sessionId,
        userId: undefined,
      };
    }

    throw new BadRequestException({
      message: ERRORS.CART_SESSION_REQUIRED,
      code: ERRORS.CART_SESSION_REQUIRED,
      requiresCookieConsent: true,
    });
  }

  @Get()
  async get(@Req() req: CartRequest) {
    const { sessionId, userId } = this.getCartIdentifiers(req);
    const result = await this.cartService.getCart(sessionId, userId);
    return result;
  }

  @Post('add')
  @ZodValidation(addToCartSchema)
  async add(@Body() dto: AddToCartDto, @Req() req: CartRequest) {
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.addToCart(dto, sessionId, userId);
  }

  @Post('merge')
  async mergeCart(@Req() req: CartRequest) {
    const sessionId = req.cookies?.sessionId;
    const userIdFromHeader = req.headers['x-user-id'];

    // Pas de sessionId ? Rien à fusionner
    if (!sessionId) {
      return { items: [] };
    }

    // Vérifier userId valide
    if (!userIdFromHeader || !Types.ObjectId.isValid(userIdFromHeader)) {
      throw new BadRequestException(ERRORS.INVALID_OBJECT_ID);
    }

    const userId = new Types.ObjectId(userIdFromHeader);

    // Effectuer la fusion
    const mergedCart = await this.cartService.mergeSessionCartToUser(
      sessionId,
      userId,
    );

    if (mergedCart) {
      // Enrichir les items avant de retourner
      const enrichedItems = await this.cartService.getCart(undefined, userId);
      return enrichedItems;
    }
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
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.deleteItem(query.productId, sessionId, userId);
  }

  @Delete('clear')
  async clear(@Req() req: CartRequest) {
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.clearCart(sessionId, userId);
  }
}
