import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FaqDocument = Faq & Document;
export interface FaqTranslation {
  fr?: string;
  en?: string;
  ar?: string;
  zh?: string;
}

@Schema({ timestamps: true })
export class Faq {
  @Prop({ type: Object, required: true, index: true, trim: true })
  question: FaqTranslation;

  @Prop({ type: Object, required: true, index: true, trim: true })
  answer: FaqTranslation;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: Date.now })
  order: number;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
