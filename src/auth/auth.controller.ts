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
    return await this.usersService.getUser({
      userId: request.user.userId,
    });
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
    console.log(req.user);
    return req.user;
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
    console.log(req.user);
    return req.user;
  }
}
