import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;
<<<<<<< HEAD

  @Prop({ required: false })
  deleted_at?: Date;
=======
>>>>>>> 7745e39a26d7746d88cc29acb2cc33af319f7b26
}

export const CategorySchema = SchemaFactory.createForClass(Category);
