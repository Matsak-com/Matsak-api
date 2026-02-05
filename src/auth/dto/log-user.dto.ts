import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';

export class LogUserDto {
  @IsEmail(
    {},
    {
      message: 'You must provide a valid email address.',
    },
  )
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8, {
    message: 'Your password must be more than 8 characters long.',
  })
  password: string;

  @IsString()
  @IsOptional()
  provider?: string; // Optional field for provider (e.g., 'facebook', 'google')

  @IsString()
  @IsOptional()
  accessToken?: string; // Optional field for access token (e.g., from Facebook or Google)
}