import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export type TeamDocument = Team & Document;
@Schema({ timestamps: true })
export class Team extends Document {
  @Prop({ required: false })
  @IsString()
  @IsOptional()
  picture?: string;

  @Prop({ required: false })
  @IsString()
  @IsOptional()
  mobile?: string;

  @Prop({ required: true, trim: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Prop({ required: true, trim: true })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @Prop({ required: false, trim: true })
  @IsString()
  @IsOptional()
  countryCode: string;

  @Prop({ required: false, trim: true })
  @IsString()
  @IsOptional()
  region: string;

  @Prop({ required: false, trim: true })
  @IsString()
  @IsOptional()
  address: string;

  @Prop({ required: false, trim: true })
  @IsString()
  @IsOptional()
  city: string;

  @Prop({ required: false, trim: true })
  @IsString()
  @IsOptional()
  additionalAddress?: string;

  @Prop({ required: false })
  @IsString()
  @IsOptional()
  postalCode: string;

  @Prop({ required: false })
  @IsString()
  @IsOptional()
  country: string;

  @Prop({ required: false })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @Prop({ required: false, type: Object })
  @IsOptional()
  coordinates?: Record<string, any>;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  language: string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  timezone: string;

  @Prop({ required: true, unique: true, trim: true })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @Prop({ required: true, trim: true })
  @IsString()
  @IsNotEmpty()
  name: string;

  // Review aggregates for teams
  @Prop({ type: Number, default: 0, min: 0 })
  averageRating: number;

  @Prop({ type: Number, default: 0, min: 0 })
  reviewCount: number;

  @Prop({ required: false })
  deleted_at?: Date;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
