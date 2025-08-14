import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from 'src/product/product.schema';
import { Team } from 'src/teams/team.schema';

export type TeamProductDocument = TeamProduct & Document; 

@Schema({ timestamps: true })
export class TeamProduct {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Team.name, required: true })
  team: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: Number, required: true, min: 0 })
  stock: number;

  
  @Prop({ required: false })
  deleted_at?: Date;
}

export const TeamProductSchema = SchemaFactory.createForClass(TeamProduct);
