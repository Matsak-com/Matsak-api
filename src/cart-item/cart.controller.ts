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
import { Request } from 'express';
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

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  @ZodValidation(addToCartSchema)
  async add(@Body() dto: AddToCartDto, @Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) {
      throw new BadRequestException(ERRORS.SESSION_ID_MISSING);
    }

    return this.cartService.addToCart(dto, sessionId);
  }

  @Get()
  async get(@Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) {
      throw new BadRequestException(ERRORS.SESSION_ID_MISSING);
    }

    return this.cartService.getCart(sessionId);
  }

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
    if (!sessionId) {
      throw new BadRequestException(ERRORS.SESSION_ID_MISSING);
    }

    return this.cartService.updateItemQuantity(
      query.productId,
      body.quantity,
      sessionId,
    );
  }

  @Delete('remove')
  @CompoundZodValidation({ query: productIdQuerySchema })
  async remove(@Req() req: Request, @Query() query: { productId: string }) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) {
      throw new BadRequestException(ERRORS.SESSION_ID_MISSING);
    }

    return this.cartService.deleteItem(query.productId, sessionId);
  }

  @Delete('clear')
  async clear(@Req() req: Request) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) {
      throw new BadRequestException(ERRORS.SESSION_ID_MISSING);
    }

    return this.cartService.clearCart(sessionId);
  }
}
