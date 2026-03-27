import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @IsNotEmpty()
  @MinLength(8, {
    message: 'Your password must be more than 8 characters long.',
  })
  newPassword: string;

  @IsString({
    message: 'You must provide a token.',
  })
  token: string;
}
