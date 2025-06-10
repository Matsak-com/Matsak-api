import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubCategoryDocument = SubCategory & Document;

@Schema({ timestamps: true })
export class SubCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId;

<<<<<<< HEAD
  @Prop({ required: false })
  deleted_at?: Date;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);
=======

}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);


>>>>>>> 7745e39a26d7746d88cc29acb2cc33af319f7b26
