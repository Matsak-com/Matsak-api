import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from './cart-item.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { BaseRepository } from '../common/base.repository'; // adapte le chemin si nécessaire

@Injectable()
export class CartService {
  private cartRepository: BaseRepository<Cart>;

  constructor(@InjectModel('Cart') private cartModel: Model<Cart>) {
    this.cartRepository = new BaseRepository<Cart>(this.cartModel);
  }

  async addToCart(sessionId: string, dto: AddToCartDto) {
    const quantity = dto.quantity ?? 1; // Par défaut 1 si non fourni
    const cart = await this.cartRepository.findOne({ filter: { sessionId } });

    if (!cart) {
      return this.cartRepository.create({
        doc: {
          sessionId,
          items: [{ product: new Types.ObjectId(dto.productId), quantity }],
        },
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === dto.productId,
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: new Types.ObjectId(dto.productId), quantity });
    }

    return cart.save();
  }

  async getCart(sessionId: string) {
    const cart = await this.cartRepository.findOne({
      filter: { sessionId },
      options: {
        populate: {
          path: 'items.product',
          populate: [
            { path: 'detail' },
            { path: 'subcategory' },
            { path: 'images' },
          ],
        },
      },
    });

    if (!cart) throw new NotFoundException('Panier introuvable');
    return cart;
  }

  async updateItemQuantity(
    sessionId: string,
    productId: string,
    quantity: number,
  ) {
    const cart = await this.cartRepository.findOne({ filter: { sessionId } });
    if (!cart) throw new NotFoundException('Panier introuvable');

    const item = cart.items.find(
      (item) => item.product.toString() === productId,
    );
    if (!item) throw new NotFoundException('Produit dans le panier non trouvé');

    item.quantity = quantity;
    return cart.save();
  }

  async deleteItem(sessionId: string, productId: string) {
    const cart = await this.cartRepository.findOne({ filter: { sessionId } });
    if (!cart) throw new NotFoundException('Panier introuvable');

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );
    return cart.save();
  }

  async clearCart(sessionId: string) {
    const cart = await this.cartRepository.findOne({ filter: { sessionId } });
    if (!cart) throw new NotFoundException('Panier introuvable');

    cart.items = []; // Vide tous les produits du panier
    return cart.save();
  }
}
