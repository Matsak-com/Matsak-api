import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryTransactionDocument = InventoryTransaction & Document;

@Schema({ timestamps: true })
export class InventoryTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ['in', 'out', 'adjustment'],
    index: true,
  })
  type: 'in' | 'out' | 'adjustment';

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  previousStock: number;

  @Prop({ type: Number, required: true })
  newStock: number;

  @Prop({ type: String, required: false })
  reason?: string;

  @Prop({ type: String, required: false })
  reference?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  performedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: true, index: true })
  team: Types.ObjectId;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const InventoryTransactionSchema =
  SchemaFactory.createForClass(InventoryTransaction);
