// detail-product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DetailProductDocument = DetailProduct & Document;

@Schema({ timestamps: true })
export class DetailProduct {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  composition: string;

  @Prop()
  form: string;

  @Prop()
  indications: string;

  @Prop()
  contraindications: string;

  @Prop()
  sideEffects: string;

  @Prop()
  precautions: string;

  @Prop()
  expirationDate: Date;

  @Prop()
  manufacturer: string;

  @Prop({ default: false })
  isRepackaged: boolean; // true si déconditionné, false sinon

  @Prop({ required: false })
  deleted_at?: Date;
}

export const DetailProductSchema = SchemaFactory.createForClass(DetailProduct);
