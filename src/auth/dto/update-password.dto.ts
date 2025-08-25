import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, {
    message: 'Your password must be more than 8 characters long.',
  })
  newPassword: string;
}
