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

    // 🆕 Créer panier s'il n'existe pas
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

    // 🔁 Produit déjà présent ?
    const item = cart.items.find(
      (i) => i.product.toString() === dto.productId,
    );

    if (item) {
      item.quantity += quantity;
    } else {
      cart.items.push({
        product: dto.productId as any,
        quantity,
      });
    }

    return this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: cart.items },
    });
  }

  // 📦 Récupérer panier
  async getCart(sessionId?: string, userId?: Types.ObjectId) {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    const enrichedItems = await this.enrichCartItems(cart.items);
    return { items: enrichedItems };
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

    const item = cart.items.find(
      (i) => i.product.toString() === productId,
    );
    if (!item)
      throw new NotFoundException(ERRORS.CART_PRODUCT_NOT_FOUND);

    item.quantity = quantity;

    await this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: cart.items },
    });

    const enrichedItems = await this.enrichCartItems(cart.items);
    return { items: enrichedItems };
  }

  // ❌ Supprimer produit
  async deleteItem(
    productId: string,
    sessionId?: string,
    userId?: Types.ObjectId,
  ) {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    cart.items = cart.items.filter(
      (i) => i.product.toString() !== productId,
    );

    return this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: cart.items },
    });
  }

  // 🧹 Vider panier
  async clearCart(sessionId?: string, userId?: Types.ObjectId) {
    const cart = await this.findCart(sessionId, userId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    return this.cartRepository.update({
      id: cart._id as Types.ObjectId,
      update: { items: [] },
    });
  }
}
