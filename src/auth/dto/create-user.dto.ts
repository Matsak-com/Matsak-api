import { IsString, IsEmail, IsNotEmpty, MinLength,  IsEnum, } from 'class-validator';
import { UserRole } from 'src/users/user.schema';

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

    @IsEnum(UserRole, { message: 'Role must be either "user" or "admin".' })
    role: UserRole;

    isResettingPassword?: boolean;
    resetPasswordToken?: string;
    avatarFileKey?: string;
}