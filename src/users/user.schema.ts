import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

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
}

export const UserSchema = SchemaFactory.createForClass(User);