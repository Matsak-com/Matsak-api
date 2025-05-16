import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsMongoId()
  @IsOptional()
  role?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  teamId?: Types.ObjectId;
}
