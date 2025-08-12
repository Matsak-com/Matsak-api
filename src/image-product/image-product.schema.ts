import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImageProductDocument = ImageProduct & Document;

@Schema({ timestamps: true })
export class ImageProduct {
  @Prop({ required: true })
  data: string; // base64 string

  @Prop({ required: true })
  name: string; // original file name, e.g., 'image.png'

  @Prop({ required: true })
  mimeType: string; // ex: image/png, image/jpeg

  @Prop()
  altText: string;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const ImageProductSchema = SchemaFactory.createForClass(ImageProduct);
