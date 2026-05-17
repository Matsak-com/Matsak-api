import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PrescriptionDocument = Prescription & Document;

// ✅ Renommé en PENDING/VALIDATED/REFUSED pour cohérence avec le reste du codebase
export enum PrescriptionStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  REFUSED = 'refused',
}

@Schema({ timestamps: true })
export class Prescription {
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  storagePath: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  // ✅ sparse: true sans default: null → index ne couvre que les docs avec un vrai ObjectId
  @Prop({
    type: Types.ObjectId,
    ref: 'Cart',
    required: false,
    sparse: true,
    index: true,
  })
  cartId?: Types.ObjectId | null;

  // ✅ idem pour invoiceId
  @Prop({
    type: Types.ObjectId,
    ref: 'Invoice',
    required: false,
    sparse: true,
    index: true,
  })
  invoiceId?: Types.ObjectId | null;

  @Prop({
    required: true,
    enum: Object.values(PrescriptionStatus),
    default: PrescriptionStatus.PENDING,
    index: true,
  })
  status: PrescriptionStatus;

  @Prop({ required: false, index: true })
  userId?: string;

  @Prop({ required: false })
  validatedBy?: string;

  @Prop({ required: false })
  validatedAt?: Date;

  @Prop({ required: false })
  rejectionReason?: string;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
