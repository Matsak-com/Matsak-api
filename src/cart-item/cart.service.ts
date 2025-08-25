import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { Product } from 'src/product/product.schema';

@Injectable()
export class CartService {
  // Map pour stocker les paniers en mémoire
  private carts = new Map<string, { items: { product: string, quantity: number }[] }>();

  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

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
    const existingItem = cart.items.find(item => item.product === dto.productId);
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
    if (!cart) throw new NotFoundException('Panier introuvable');

    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.productModel
          .findById(item.product)
          .populate('detail')       
          .populate('subcategory')  
          .populate('images')       
          .lean();

        return {
          ...item,
          product,
        };
      }),
    );

    return { items: enrichedItems };
  }


  // Mettre à jour la quantité d'un produit
  async updateItemQuantity(sessionId: string, productId: string, quantity: number) {
    const cart = this.carts.get(sessionId);
    if (!cart) throw new NotFoundException('Panier introuvable');

    const item = cart.items.find(i => i.product === productId);
    if (!item) throw new NotFoundException('Produit introuvable dans le panier');

    item.quantity = quantity;

    // Enrichir les items avec les informations produit comme dans getCart
    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.productModel
          .findById(item.product)
          .populate('detail')
          .populate('subcategory')
          .populate('images')
          .lean();

        return {
          ...item,
          product,
        };
      }),
    );

    return { items: enrichedItems };
  }


  // Supprimer un produit du panier
  async deleteItem(sessionId: string, productId: string) {
    const cart = this.carts.get(sessionId);
    if (!cart) throw new NotFoundException('Panier introuvable');

    cart.items = cart.items.filter(i => i.product !== productId);
    return cart;
  }

  // Vider le panier
  async clearCart(sessionId: string) {
    const cart = this.carts.get(sessionId);
    if (!cart) throw new NotFoundException('Panier introuvable');

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
