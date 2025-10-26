import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDate,
  IsMongoId,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMemberDto } from './create-member.dto';
import { MemberStatus } from '../member.schema';

export class UpdateMemberDto extends PartialType(CreateMemberDto) {
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  lastActiveAt?: Date;
}

export class UpdateMemberStatusDto {
  @IsEnum(MemberStatus)
  @IsNotEmpty()
  status: MemberStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateMemberPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class TransferMembershipDto {
  @IsMongoId()
  @IsNotEmpty()
  newOwnerId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
