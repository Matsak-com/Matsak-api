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
  UseGuards,
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
import { UserPayload } from 'src/auth/jwt/jwt.strategy';
import { Types } from 'mongoose';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt.guard';

// 🔹 Interface pour combiner Request + UserPayload + cookies
interface CartRequest extends Request {
  user?: UserPayload;
}

@Controller('cart')
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // 🔹 Méthode utilitaire pour extraire sessionId et userId
  private getCartIdentifiers(req: CartRequest) {
    const sessionId = req.cookies?.sessionId;
    const userId = req.user?.userId;

    // Si utilisateur connecté, on utilise UNIQUEMENT userId
    if (userId) {
      return { 
        sessionId: undefined,  // ← Important : ne pas envoyer sessionId
        userId: new Types.ObjectId(userId) 
      };
    }

    // Sinon on utilise sessionId
    if (sessionId) {
      return { 
        sessionId, 
        userId: undefined 
      };
    }

    throw new BadRequestException(ERRORS.SESSION_ID_MISSING);
  }

  // 🔀 Méthode pour gérer la fusion des paniers
  private async handleCartMerge(req: CartRequest) {
    const sessionId = req.cookies?.sessionId;
    const userId = req.user?.userId;

    // Si utilisateur connecté ET session présente, fusionner
    if (userId && sessionId) {
      try {
        await this.cartService.mergeSessionCartToUser(
          sessionId, 
          new Types.ObjectId(userId)
        );
      } catch (error) {
        console.error('Erreur fusion panier:', error);
      }
    }
  }

  @Post('add')
  @ZodValidation(addToCartSchema)
  async add(@Body() dto: AddToCartDto, @Req() req: CartRequest) {
    await this.handleCartMerge(req);
    
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.addToCart(dto, sessionId, userId);
  }

  @Get()
  async get(@Req() req: CartRequest) {
    console.log('🔍 GET /cart - cookies:', req.cookies?.sessionId)
    console.log('🔍 GET /cart - user:', req.user)
    await this.handleCartMerge(req);
    
    const { sessionId, userId } = this.getCartIdentifiers(req);
      console.log('🔍 GET /cart - identifiers:', { 
    sessionId, 
    userId: userId?.toString() 
  })
  const result = await this.cartService.getCart(sessionId, userId);
    console.log('🔍 GET /cart - result items count:', result.items?.length)

    return result
    
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
    await this.handleCartMerge(req);
    
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
    await this.handleCartMerge(req);
    
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.deleteItem(query.productId, sessionId, userId);
  }

  @Delete('clear')
  async clear(@Req() req: CartRequest) {
    await this.handleCartMerge(req);
    
    const { sessionId, userId } = this.getCartIdentifiers(req);
    return this.cartService.clearCart(sessionId, userId);
  }
}