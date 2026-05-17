import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
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
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { UserPayload } from '../auth/jwt/jwt.strategy';
import { randomUUID } from 'crypto';

@UseGuards(OptionalJwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Resolves the cart owner from JWT (authenticated) or session cookie (guest).
   * If neither is present, generates a new sessionId, sets it as an httpOnly
   * cookie, and uses it for the current request (anonymous guest cart).
   */
  private resolveCartOwner(
    user: UserPayload | null,
    req: Request,
    res: Response,
  ): { sessionId?: string; userId?: Types.ObjectId } {
    if (user?.userId && Types.ObjectId.isValid(user.userId)) {
      return { userId: new Types.ObjectId(user.userId) };
    }

    let sessionId = req.cookies?.sessionId as string | undefined;

    if (!sessionId) {
      sessionId = randomUUID();
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      req.cookies.sessionId = sessionId;
    }

    return { sessionId };
  }

  @Get()
  async get(
    @CurrentUser() user: UserPayload | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sessionId, userId } = this.resolveCartOwner(user, req, res);
    return this.cartService.getCart(sessionId, userId);
  }

  @Post('add')
  @ZodValidation(addToCartSchema)
  async add(
    @Body() dto: AddToCartDto,
    @CurrentUser() user: UserPayload | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sessionId, userId } = this.resolveCartOwner(user, req, res);
    return this.cartService.addToCart(dto, sessionId, userId);
  }

  /**
   * Merges the guest session cart into the authenticated user's cart.
   * Requires a valid JWT — only callable after login.
   */
  @Post('merge')
  @UseGuards(JwtAuthGuard)
  async mergeCart(@CurrentUser() user: UserPayload, @Req() req: Request) {
    const sessionId = req.cookies?.sessionId as string | undefined;
    const userId = new Types.ObjectId(user.userId);

    if (!sessionId) {
      return this.cartService.getCart(undefined, userId);
    }

    return this.cartService.mergeSessionCartToUser(sessionId, userId);
  }

  @Patch('update')
  @CompoundZodValidation({
    query: productIdQuerySchema,
    body: updateCartQuantitySchema,
  })
  async updateQuantity(
    @CurrentUser() user: UserPayload | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query() query: { productId: string },
    @Body() body: { quantity: number },
  ) {
    const { sessionId, userId } = this.resolveCartOwner(user, req, res);
    return this.cartService.updateItemQuantity(
      query.productId,
      body.quantity,
      sessionId,
      userId,
    );
  }

  @Delete('remove')
  @CompoundZodValidation({ query: productIdQuerySchema })
  async remove(
    @CurrentUser() user: UserPayload | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query() query: { productId: string },
  ) {
    const { sessionId, userId } = this.resolveCartOwner(user, req, res);
    return this.cartService.deleteItem(query.productId, sessionId, userId);
  }

  @Delete('clear')
  async clear(
    @CurrentUser() user: UserPayload | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sessionId, userId } = this.resolveCartOwner(user, req, res);
    return this.cartService.clearCart(sessionId, userId);
  }
}
