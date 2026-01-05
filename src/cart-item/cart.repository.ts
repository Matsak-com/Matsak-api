// cart.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Cart } from './cart-item.schema';

@Injectable()
export class CartRepository extends BaseRepository<Cart> {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,
  ) {
    super(cartModel);
  }

  findBySessionId(sessionId: string) {
    return this.findOne({
      filter: { sessionId },
    });
  }

  findByUserId(userId: Types.ObjectId) {
    return this.findOne({
      filter: { userId },
    });
  }
}
