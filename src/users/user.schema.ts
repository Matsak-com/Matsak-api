// user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsPhoneNumber,
  IsOptional,
  IsBoolean,
  Length,
} from 'class-validator';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
  MODERATOR = 'moderator',
}

// Sous-schéma pour les adresses
@Schema({ _id: true, timestamps: true })
export class Address {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  @IsString()
  @Length(2, 50)
  firstName: string;

  @Prop({ required: true })
  @IsString()
  @Length(2, 50)
  lastName: string;

  @Prop({ required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  company?: string;

  @Prop({ required: true })
  @IsPhoneNumber()
  phone: string;

  @Prop({ required: true })
  @IsString()
  @Length(5, 200)
  addressLine: string;

  @Prop({ required: false })
  deliveryNotes?: string;

  @Prop({ required: true })
  @IsString()
  @Length(2, 100)
  city: string;

  @Prop({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @Prop({ required: false, default: false })
  @IsBoolean()
  isDefault: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

export type UserDocument = User & Document;

@Schema({ timestamps: true })
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

  @Prop({ required: false, unique: true, sparse: true })
  @IsString()
  resetPasswordToken?: string | null;

  @Prop({ required: false, default: null })
  @IsString()
  avatarFileKey?: string | null;

  @Prop({ required: false })
  @IsString()
  phone?: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  role: UserRole;

  @Prop({ required: false, default: null })
  @IsString()
  provider?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: false, default: null })
  current_team?: Types.ObjectId | null;

  // ✅ Tableau d'adresses
  @Prop({ type: [AddressSchema], default: [] })
  addresses: Address[];

  @Prop({ required: false })
  deleted_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
