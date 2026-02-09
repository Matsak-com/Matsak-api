import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  // ══════════════════════════════════════════════════════════════
  // RÉFÉRENCES - Tout vient de Payment et Cart
  // ══════════════════════════════════════════════════════════════
  @Prop({ type: Types.ObjectId, ref: 'Payment', required: true, unique: true, index: true })
  payment: Types.ObjectId;

  // ══════════════════════════════════════════════════════════════
  // FACTURE - Juste le numéro pour la comptabilité
  // ══════════════════════════════════════════════════════════════
  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string;

  @Prop({ required: true, default: () => new Date() })
  invoiceDate: Date;

  // ══════════════════════════════════════════════════════════════
  // STATUT - Gestion comptable
  // ══════════════════════════════════════════════════════════════
  @Prop({
    required: true,
    enum: ['paid', 'refunded', 'cancelled'],
    default: 'paid',
    index: true,
  })
  status: 'paid' | 'refunded' | 'cancelled';

  @Prop({ required: false })
  refundedAt?: Date;

  // Soft delete
  @Prop({ required: false })
  deleted_at?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Indexes
InvoiceSchema.index({ payment: 1 }, { unique: true });
InvoiceSchema.index({ status: 1, invoiceDate: -1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });