import { Injectable, NotFoundException } from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ProductRepository } from '../product/product.repository';
import { CartRepository } from './cart.repository';
import { Types } from 'mongoose';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  // 🔹 Enrichir les items avec produit + quantité
  private async enrichCartItems(items: any[]) {
    return Promise.all(
      items.map(async (item) => {
        const product = await this.productRepository.findById({
          id: item.product,
          options: { populate: ['detail', 'images', 'team'], lean: true },
        });

        return {
          ...product,
          quantity: item.quantity,
        };
      }),
    );
  }

  // 🔍 Trouver panier (session OU user)
  private async findCart(sessionId?: string, userId?: Types.ObjectId) {
    if (userId) return this.cartRepository.findByUserId(userId);
    if (sessionId) return this.cartRepository.findBySessionId(sessionId);
    return null;
  }

  // ➕ Ajouter au panier
  async addToCart(
    dto: AddToCartDto,
    sessionId?: string,
    userId?: Types.ObjectId,
  ) {
    const quantity = dto.quantity ?? 1;

    let cart = await this.findCart(sessionId, userId);

    // 🆕 Création panier
    if (!cart) {
      cart = await this.cartRepository.create({
        doc: {
          sessionId,
          userId,
          items: [
            {
              product: dto.productId as any,
              quantity,
            },
          ],
        },
      });

      return cart;
    }

    // 🔁 Panier existe → ajouter ou incrémenter
    const existingItem = cart.items.find(
      (item) => item.product.toString() === dto.productId,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: dto.productId as any,
        quantity,
      });
    }

    await this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: cart.items },
    });

    return cart;
  }

  // 📦 Récupérer panier
  async getCart(sessionId?: string, userId?: Types.ObjectId) {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    const enrichedItems = await this.enrichCartItems(cart.items);
    return { 
      _id: cart._id,
      items: enrichedItems 
    };
  }

  async mergeSessionCartToUser(sessionId: string, userId: Types.ObjectId) {
    const sessionCart = await this.cartRepository.findBySessionId(sessionId);

    if (!sessionCart || sessionCart.items.length === 0) {
      return null;
    }

    let userCart = await this.cartRepository.findByUserId(userId);

    if (!userCart) {
      userCart = await this.cartRepository.create({
        doc: {
          userId,
          items: sessionCart.items,
        },
      });

      await this.cartRepository.delete({
        id: sessionCart._id as Types.ObjectId,
      });
      return userCart;
    }

    for (const sessionItem of sessionCart.items) {
      const existingItem = userCart.items.find(
        (i) => i.product.toString() === sessionItem.product.toString(),
      );

      if (existingItem) {
        existingItem.quantity += sessionItem.quantity;
      } else {
        userCart.items.push(sessionItem);
      }
    }

    await this.cartRepository.update({
      id: userCart._id as Types.ObjectId,
      update: { items: userCart.items },
    });

    await this.cartRepository.delete({ id: sessionCart._id as Types.ObjectId });

    return userCart;
  }

  // 🔄 Mettre à jour quantité
  async updateItemQuantity(
    productId: string,
    quantity: number,
    sessionId?: string,
    userId?: Types.ObjectId,
  ) {
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
    return { 
      _id: cart._id,
      items: enrichedItems 
    };
  }

  // ❌ Supprimer produit
  async deleteItem(
    productId: string,
    sessionId?: string,
    userId?: Types.ObjectId,
  ) {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    cart.items = cart.items.filter((i) => i.product.toString() !== productId);

    return this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: cart.items },
    });
  }

  // 🧹 Vider panier (clear items only)
  async clearCart(sessionId?: string, userId?: Types.ObjectId) {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    return this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: [] },
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // ✅ NOUVELLE MÉTHODE : Soft Delete du panier après paiement
  // ══════════════════════════════════════════════════════════════════
  async softDeleteCart(cartId: string): Promise<void> {
    const cart = await this.cartRepository.findById({
      id: new Types.ObjectId(cartId),
    });

    if (!cart) {
      throw new NotFoundException(`Panier ${cartId} introuvable`);
    }

    // Vider les items ET marquer comme supprimé
    await this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: {            
        deleted_at: new Date(), // Soft delete
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // ✅ MÉTHODE ALTERNATIVE : Soft Delete par ObjectId direct
  // ══════════════════════════════════════════════════════════════════
  async softDeleteCartById(cartId: Types.ObjectId): Promise<void> {
    await this.cartRepository.update({
      id: cartId,
      update: {
        deleted_at: new Date(),
      },
    });
  }
}