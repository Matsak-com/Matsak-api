import { Injectable, NotFoundException } from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ProductRepository } from '../product/product.repository';

@Injectable()
export class CartService {
  // Map pour stocker les paniers en mémoire
  private carts = new Map<
    string,
    { items: { product: string; quantity: number }[] }
  >();

  constructor(private readonly productRepository: ProductRepository) {}

  // Private method to enrich cart items with product details
  private async enrichCartItems(
    items: { product: string; quantity: number }[],
  ): Promise<any[]> {
    return Promise.all(
      items.map(async (item) => {
        const product = await this.productRepository.findById({
          id: item.product,
          options: { populate: ['detail', 'images'], lean: true },
        });

        return {
          ...item,
          product,
        };
      }),
    );
  }

  // Ajouter un produit au panier (en mémoire)
  async addToCart(sessionId: string, dto: AddToCartDto) {
    const quantity = dto.quantity ?? 1;

    // Chercher ou créer le panier en mémoire
    let cart = this.carts.get(sessionId);
    if (!cart) {
      cart = { items: [] };
      this.carts.set(sessionId, cart);
    }
    // Vérifier si le produit existe déjà
    const existingItem = cart.items.find(
      (item) => item.product === dto.productId,
    );
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: dto.productId, quantity });
    }

    return cart;
  }

  // Récupérer le panier pour une session
  async getCart(sessionId: string) {
    const cart = this.carts.get(sessionId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    const enrichedItems = await this.enrichCartItems(cart.items);
    return { items: enrichedItems };
  }

  // Mettre à jour la quantité d'un produit
  async updateItemQuantity(
    sessionId: string,
    productId: string,
    quantity: number,
  ) {
    const cart = this.carts.get(sessionId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    const item = cart.items.find((i) => i.product === productId);
    if (!item) throw new NotFoundException(ERRORS.CART_PRODUCT_NOT_FOUND);

    item.quantity = quantity;

    // Enrichir les items avec les informations produit comme dans getCart
    const enrichedItems = await this.enrichCartItems(cart.items);
    return { items: enrichedItems };
  }

  // Supprimer un produit du panier
  async deleteItem(sessionId: string, productId: string) {
    const cart = this.carts.get(sessionId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);
    cart.items = cart.items.filter((i) => i.product !== productId);
    return cart;
  }

  // Vider le panier
  async clearCart(sessionId: string) {
    const cart = this.carts.get(sessionId);
    if (!cart) throw new NotFoundException(ERRORS.CART_NOT_FOUND);

    cart.items = [];
    return cart;
  }

  // Méthode pour debug
  async debugCart(sessionId: string) {
    const cart = this.carts.get(sessionId);
    console.log(`Debug cart for session ${sessionId}:`, cart);
    return cart;
  }
}
