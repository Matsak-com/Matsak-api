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

  @Prop({ required: true, unique: true, trim: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  region: string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  address: string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  city: string;

  @Prop({ required: false })
  @IsString()
  @IsOptional()
  additionalAddress?: string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  country: string;

  @Prop({ required: false })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @Prop({ required: false, type: Object })
  @IsOptional()
  geoLoc?: Record<string, any>;

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

  @Prop({ required: false })
  deleted_at?: Date;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
