import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LogUserDto {
  @IsEmail(
    {},
    {
      message: 'You must provide a valid email address.',
    },
  )
  email: string;

  @IsNotEmpty()
  @MinLength(8, {
    message: 'Your password must be more than 8 characters long.',
  })
  password: string;
}