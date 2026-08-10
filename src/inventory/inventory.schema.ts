import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ── Schéma pour un lot en stock ──
@Schema({ timestamps: true })
export class StockLot extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Types.ObjectId;

  @Prop({ required: true })
  lotNumber: string;

  @Prop({ required: true, min: 0 })
  quantity: number; // quantité restante dans ce lot

  @Prop({ required: true })
  initialQuantity: number;

  @Prop({ required: true })
  supplier: string;

  @Prop({ required: true })
  receptionDate: Date;

  @Prop({ required: true, index: true })
  expirationDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  team: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at?: Date;
}

export const StockLotSchema = SchemaFactory.createForClass(StockLot);

// ── Transaction existante, avec référence au(x) lot(s) concerné(s) ──
@Schema({ timestamps: true })
export class InventoryTransaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Types.ObjectId;

  @Prop({ required: true, enum: ['in', 'out', 'adjustment'], index: true })
  type: string;
  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  previousStock: number;

  @Prop({ required: true })
  newStock: number;

  @Prop()
  reason?: string;

  @Prop()
  reference?: string;

  @Prop()
  supplier?: string;

  @Prop()
  receptionDate?: Date;

  // Un stockIn peut créer plusieurs lots en une seule transaction
  @Prop({ type: [Types.ObjectId], ref: 'StockLot' })
  lots?: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  performedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  team: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at?: Date;
}

export const InventoryTransactionSchema =
  SchemaFactory.createForClass(InventoryTransaction);
