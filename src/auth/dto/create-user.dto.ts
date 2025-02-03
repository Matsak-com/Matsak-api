import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;
    
    @IsString()
    @IsNotEmpty()
    firstname: string;

    @IsEmail({},
        {
          message: 'You must provide a valid email address.',
        },)
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    @MinLength(8, {
        message: 'Your password must be more than 8 characters long.',
      })
    password: string;

    isResettingPassword?: boolean;
    resetPasswordToken?: string;
    avatarFileKey?: string;
}