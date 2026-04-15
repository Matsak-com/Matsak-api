import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ProductRepository } from '../product/product.repository';
import { CartRepository } from './cart.repository';
import { Types } from 'mongoose';
import { MAX_ITEM_QUANTITY } from '../common/schemas/cart.schemas';

type CartItem = { product: Types.ObjectId; quantity: number };
type EnrichedCartItem = Record<string, any> & { quantity: number };
type CartResponse = { _id: Types.ObjectId | null; items: EnrichedCartItem[] };

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  /** Batch-load products for all cart items in a single query (eliminates N+1). */
  private async enrichCartItems(items: CartItem[]): Promise<EnrichedCartItem[]> {
    if (items.length === 0) return [];

    const productIds = items.map((item) => item.product);

    const products = await this.productRepository.findAll({
      filter: { _id: { $in: productIds } },
      options: { populate: ['detail', 'images', 'team'], lean: true },
    });

    const productMap = new Map(
      products.map((p: any) => [p._id.toString(), p]),
    );

    return items
      .map((item) => {
        const product = productMap.get(item.product.toString());
        if (!product) return null;
        return { ...product, quantity: item.quantity };
      })
      .filter((item): item is EnrichedCartItem => item !== null);
  }

  /** Find a cart by userId (authenticated) or sessionId (guest). */
  private async findCart(sessionId?: string, userId?: Types.ObjectId) {
    if (userId) return this.cartRepository.findByUserId(userId);
    if (sessionId) return this.cartRepository.findBySessionId(sessionId);
    return null;
  }

  /** Add item to cart — validates product existence and enforces quantity cap. */
  async addToCart(
    dto: AddToCartDto,
    sessionId?: string,
    userId?: Types.ObjectId,
  ): Promise<CartResponse> {
    const quantity = dto.quantity ?? 1;

    const product = await this.productRepository.findById({
      id: dto.productId,
    });
    if (!product) {
      throw new NotFoundException(ERRORS.PRODUCT_NOT_FOUND);
    }

    let cart = await this.findCart(sessionId, userId);

    if (!cart) {
      cart = await this.cartRepository.create({
        doc: {
          sessionId,
          userId,
          items: [{ product: dto.productId as any, quantity }],
        },
      });
      const enrichedItems = await this.enrichCartItems(cart.items);
      return { _id: cart._id as Types.ObjectId, items: enrichedItems };
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === dto.productId,
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > MAX_ITEM_QUANTITY) {
        throw new BadRequestException(ERRORS.INVALID_QUANTITY);
      }
      existingItem.quantity = newQty;
    } else {
      cart.items.push({ product: dto.productId as any, quantity });
    }

    await this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: cart.items },
    });

    const enrichedItems = await this.enrichCartItems(cart.items);
    return { _id: cart._id as Types.ObjectId, items: enrichedItems };
  }

  /** Retrieve the cart. Returns an empty cart when none exists (guest flow). */
  async getCart(
    sessionId?: string,
    userId?: Types.ObjectId,
  ): Promise<CartResponse> {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) {
      return { _id: null, items: [] };
    }

    const enrichedItems = await this.enrichCartItems(cart.items);
    return { _id: cart._id as Types.ObjectId, items: enrichedItems };
  }

  /** Merge guest session cart into the authenticated user's cart on login. */
  async mergeSessionCartToUser(
    sessionId: string,
    userId: Types.ObjectId,
  ): Promise<CartResponse> {
    const sessionCart = await this.cartRepository.findBySessionId(sessionId);

    if (!sessionCart || sessionCart.items.length === 0) {
      return this.getCart(undefined, userId);
    }

    let userCart = await this.cartRepository.findByUserId(userId);

    if (!userCart) {
      userCart = await this.cartRepository.create({
        doc: { userId, items: sessionCart.items },
      });
      await this.cartRepository.delete({
        id: sessionCart._id as Types.ObjectId,
      });
    } else {
      for (const sessionItem of sessionCart.items) {
        const existingItem = userCart.items.find(
          (i) => i.product.toString() === sessionItem.product.toString(),
        );

        if (existingItem) {
          existingItem.quantity = Math.min(
            existingItem.quantity + sessionItem.quantity,
            MAX_ITEM_QUANTITY,
          );
        } else {
          userCart.items.push(sessionItem);
        }
      }

      await this.cartRepository.update({
        id: userCart._id as Types.ObjectId,
        update: { items: userCart.items },
      });
      await this.cartRepository.delete({
        id: sessionCart._id as Types.ObjectId,
      });
    }

    const enrichedItems = await this.enrichCartItems(userCart.items);
    return { _id: userCart._id as Types.ObjectId, items: enrichedItems };
  }

  /** Update the quantity of a cart item. */
  async updateItemQuantity(
    productId: string,
    quantity: number,
    sessionId?: string,
    userId?: Types.ObjectId,
  ): Promise<CartResponse> {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) throw new NotFoundException(ERRORS.CART_PRODUCT_NOT_FOUND);

    item.quantity = quantity;

    await this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: cart.items },
    });

    const enrichedItems = await this.enrichCartItems(cart.items);
    return { _id: cart._id as Types.ObjectId, items: enrichedItems };
  }

  /** Remove a single product from the cart. */
  async deleteItem(
    productId: string,
    sessionId?: string,
    userId?: Types.ObjectId,
  ): Promise<CartResponse> {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (i) => i.product.toString() !== productId,
    );

    if (cart.items.length === originalLength) {
      throw new NotFoundException(ERRORS.CART_PRODUCT_NOT_FOUND);
    }

    await this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: cart.items },
    });

    const enrichedItems = await this.enrichCartItems(cart.items);
    return { _id: cart._id as Types.ObjectId, items: enrichedItems };
  }

  /** Clear all items from the cart (keeps the cart document). */
  async clearCart(
    sessionId?: string,
    userId?: Types.ObjectId,
  ): Promise<CartResponse> {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    await this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: [] },
    });

    return { _id: cart._id as Types.ObjectId, items: [] };
  }

  /**
   * Soft delete with verification — for exposed API endpoints.
   * Throws NotFoundException if the cart does not exist.
   */
  async softDeleteCart(cartId: string): Promise<void> {
    const objectId = new Types.ObjectId(cartId);
    const cart = await this.cartRepository.findById({ id: objectId });
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);
    await this.softDeleteCartById(objectId);
  }

  /**
   * Soft delete without verification — internal use only
   * when cart existence is already guaranteed (e.g. post-payment).
   */
  async softDeleteCartById(cartId: Types.ObjectId): Promise<void> {
    await this.cartRepository.update({
      id: cartId,
      update: { deleted_at: new Date() },
    });
  }
}
