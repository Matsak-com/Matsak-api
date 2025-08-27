import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: true })
  activate: boolean;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
