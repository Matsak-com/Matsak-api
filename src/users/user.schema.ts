import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  IsEmail,
  IsNotEmpty,
  isString,
  IsString,
  MinLength,
} from 'class-validator';

export type UserDocument = User & Document;
@Schema()
export class User extends Document {
  @Prop({ required: false })
  @IsString()
  @IsNotEmpty()
  name: string;

  @Prop({ required: false })
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @Prop({ required: true, unique: true })
  @IsEmail()
  email: string;

  @Prop({ required: true })
  @IsString()
  @MinLength(8)
  password: string;

  @Prop({ required: false, default: false })
  isResettingPassword: boolean;

  @Prop({ required: false, unique: true })
  @IsString()
  resetPasswordToken?: string;

  @Prop({ required: false, unique: true })
  @IsString()
  avatarFileKey?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
