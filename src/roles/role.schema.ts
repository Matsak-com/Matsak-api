import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { number } from 'zod';

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: number, required: true, default: 0 })
  level: number;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ required: false })
  deleted_at?: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
