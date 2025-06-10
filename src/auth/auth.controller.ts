import {
  Controller,
  Post,
  Body,
  ConflictException,
  UseGuards,
  Get,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/log-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { RequestWithUser } from './jwt/jwt.strategy';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from 'src/users/user.schema';
import { FacebookProvider } from 'src/sso/facebook/facebook.provider';
import { generateRandomPassword } from 'src/users/utils/password.utils';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.authService.register({ createUserDto });
      return { message: 'User registered successfully', user };
    } catch (error) {
      if (error.status === 409) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Post('login')
  async login(@Body() loginDto: LogUserDto) {
    return this.authService.login({ loginDto });
  }

  @Post('request-reset-password')
  async resetUserPasswordRequest(@Body('email') email: string) {
    return await this.authService.resetUserPasswordRequest({
      email,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  async resetUserPassword(@Body() resetPasswordDto: ResetUserPasswordDto) {
    return await this.authService.resetUserPassword({
      resetPasswordDto,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify-reset-password-token')
  async verifyResetPasswordToken(@Query('token') token: string) {
    return await this.authService.verifyResetPasswordToken({
      token,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAuthenticatedUser(@Request() request: RequestWithUser) {
    return await this.usersService.getUser(request.user.userId); 
  }


  @UseGuards(AuthGuard('google'))
  @Get('google/login')
  async googleAuth(@Request() req) {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req) {
    // Handles the Google OAuth2 callback
    const user = req.user;

    // Check if the user exists in the database
    let existingUser = await this.usersService.findByEmail(user.email);
    if (!existingUser) {
      // If the user does not exist, save them to the database
      const randomPassword = generateRandomPassword();
      existingUser = await this.usersService.create({
        email: user.email,
        name: user.lastName,
        firstname: user.firstName,
        password: randomPassword,
        role: UserRole.USER,
        provider: 'google',
      });
    }

    const token = await this.authService.login({
      loginDto: {
        email: existingUser.email,
        password: '',
        provider: 'google',
        accessToken: user.accessToken,
      },
    });

    return {
      message: 'User authenticated successfully',
      user: existingUser,
      token,
    };
  }

  @UseGuards(AuthGuard('facebook'))
  @Get('facebook/login')
  async facebookAuth(@Request() req) {
    // Initiates the Facebook OAuth2 login flow
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Request() req) {
    // Handles the Facebook OAuth2 callback
    const user = req.user;
    const facebookProvider = new FacebookProvider();
    const userData = facebookProvider.handleAndValidateUserData(user.profile);
    console.log('User data from Facebook:', userData);
    // Check if the user exists in the database
    // let existingUser = await this.usersService.findByEmail(user.email);
    // if (!existingUser) {
    //   // If the user does not exist, save them to the database
    //   existingUser = await this.usersService.create({
    //     email: user.email,
    //     name: user.name,
    //     firstname: '',
    //     password: '',
    //     role: UserRole.USER,
    //   });
    // }

    // // Log the user in
    // const token = await this.authService.login({
    //   loginDto: {
    //     email: existingUser.email,
    //     password: '',
    //   },
    // });

    // return {
    //   message: 'User authenticated successfully',
    //   user: existingUser,
    //   token,
    // };
  }
}
