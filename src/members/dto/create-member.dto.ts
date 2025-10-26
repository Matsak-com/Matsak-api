import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsMongoId,
  IsEnum,
  IsArray,
  IsDate,
  IsBoolean,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MemberStatus } from '../member.schema';

export class CreateUserForMemberDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateMemberDto {
  @ValidateNested()
  @Type(() => CreateUserForMemberDto)
  @IsOptional()
  user?: CreateUserForMemberDto;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsMongoId()
  @IsNotEmpty()
  role: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  teams: string[];

  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsMongoId()
  @IsOptional()
  invitedBy?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  joinedAt?: Date;
}

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsMongoId()
  @IsNotEmpty()
  teamId: string;

  @IsMongoId()
  @IsNotEmpty()
  roleId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsString()
  @IsOptional()
  message?: string;

  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}

export class BulkInviteMemberDto {
  @IsArray()
  @Type(() => InviteMemberDto)
  invites: InviteMemberDto[];

  @IsMongoId()
  @IsNotEmpty()
  teamId: string;
}
