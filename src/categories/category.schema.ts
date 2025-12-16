import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

// Translation interface for category names and descriptions
export interface CategoryTranslation {
  en?: string;
  fr?: string;
  ar?: string;
  zh?: string;
}

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: Object })
  translations?: {
    name?: CategoryTranslation;
    description?: CategoryTranslation;
  };

  @Prop()
  imageUrl: string;

  @Prop({ default: true })
  status: boolean;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
