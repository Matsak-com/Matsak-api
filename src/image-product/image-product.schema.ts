import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImageProductDocument = ImageProduct & Document;

@Schema({ timestamps: true })
export class ImageProduct {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  filename: string;

  @Prop()
  altText: string;

  @Prop({ enum: ['product', 'decond'], required: true })
  type: 'product' | 'decond';

  @Prop({ required: false })
  deleted_at?: Date;
}

export const ImageProductSchema = SchemaFactory.createForClass(ImageProduct);
