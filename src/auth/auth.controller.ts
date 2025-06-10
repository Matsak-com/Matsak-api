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
import { GoogleService } from 'src/sso/google/google.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private googleService: GoogleService,
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

<<<<<<< HEAD

  @UseGuards(AuthGuard('google'))
  @Get('google/login')
  async googleAuth(@Request() req) {
    // Initiates the Google OAuth2 login flow
  }
=======
  /**
   * Handles the Google OAuth2 callback by processing the access token to retrieve user information.
   * If the user does not exist in the database, a new user is created with the provided details.
   * Issues a JWT token for the authenticated user and returns the user information along with the token.
   *
   * @param accessToken - The access token received from Google OAuth2.
   * @returns An object containing a success message, the authenticated user, and the JWT token.
   * @throws ConflictException if Google authentication fails.
   */
  @Post('google/callback')
  async googleAuthCallback(@Body('accessToken') accessToken: string) {
    try {
      // Handle Google OAuth2 callback and get user info
      const user = await this.googleService.googleCallback(accessToken);
>>>>>>> 36feb6f88173d33ef35a91f1ad5e11837bf16aa9

      // Find or create user
      let existingUser = await this.usersService.findByEmail(user.email);
      if (!existingUser) {
        existingUser = await this.usersService.create({
          email: user.email,
          name: user.lastName,
          firstname: user.firstName,
          password: generateRandomPassword(),
          role: UserRole.USER,
          provider: 'google',
        });
      }

      // Issue JWT token
      const token = await this.authService.login({
        loginDto: {
          email: existingUser.email,
          provider: 'google',
          accessToken,
          password: '', // Password is not used for OAuth providers
        },
      });

      return token;
    } catch (error) {
      throw new ConflictException(
        error.message || 'Google authentication failed',
      );
    }
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
