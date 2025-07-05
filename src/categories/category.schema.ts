import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;
<<<<<<< Updated upstream

  @Prop({ required: false })
  deleted_at?: Date;
=======
>>>>>>> Stashed changes
}

export const CategorySchema = SchemaFactory.createForClass(Category);
