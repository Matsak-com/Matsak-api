import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
} from 'class-validator';

// Définition des types de rôles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

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

  // Champ pour définir le rôle de l'utilisateur (user ou admin)
  @Prop({ required: true, enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
