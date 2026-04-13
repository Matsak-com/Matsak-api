import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PrescriptionDocument = Prescription & Document;

export enum PrescriptionStatus {
  AWAIT = 'await',
  VALIDATE = 'validate',
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

  @Prop({
    type: Types.ObjectId,
    ref: 'Cart',
    required: false,
    sparse: true,
    index: true,
    default: null,
  })
  cartId?: Types.ObjectId | string | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Invoice',
    required: false,
    index: { partialFilterExpression: { invoiceId: { $type: 'objectId' } } },
    default: null,
  })
  invoiceId?: Types.ObjectId | string | null;

  @Prop({
    required: true,
    enum: Object.values(PrescriptionStatus),
    default: PrescriptionStatus.AWAIT,
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
