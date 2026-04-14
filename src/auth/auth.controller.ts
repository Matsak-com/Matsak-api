import {
  Controller,
  Post,
  Body,
  ConflictException,
  UseGuards,
  Get,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
  HttpException,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/log-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { RequestWithUser } from './jwt/jwt.strategy';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../users/user.schema';
import { FacebookProvider } from '../sso/facebook/facebook.provider';
import { generateRandomPassword } from '../users/utils/password.utils';
import { GoogleService } from '../sso/google/google.service';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';
import {
  createUserSchema,
  loginUserSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  googleCallbackSchema,
  tokenQuerySchema,
  updateLocaleSchema,
} from '../common/schemas/auth.schemas';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private googleService: GoogleService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation(createUserSchema)
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      const result = await this.authService.register(createUserDto);
      return {
        success: true,
        message: result.message,
        accessToken: result.accessToken,
        user: result.user,
        role: result.role,
        current_team: result.current_team,
      };
    } catch (error) {
      if (error.status === HttpStatus.CONFLICT) {
        throw new ConflictException(ERRORS.EMAIL_ALREADY_EXISTS);
      }
      throw new HttpException(
        ERRORS.REGISTRATION_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('update-locale')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ZodValidation(updateLocaleSchema)
  async updateLocale(@Body() body: any, @Request() req: any) {
    try {
      const { locale } = body;
      const userId = req.user.userId;
      const result = await this.authService.updateUserLocale(userId, locale);

      return {
        success: true,
        message: 'Locale updated successfully',
        locale: result.locale,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        ERRORS.LOCALE_UPDATE_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  @ZodValidation(loginUserSchema)
  async login(@Body() loginDto: LogUserDto) {
    return this.authService.login({ loginDto });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ZodValidation(resetPasswordRequestSchema)
  async forgotPassword(@Body() body: { email: string }) {
    return await this.authService.forgotPassword({
      email: body.email,
    });
  }

  @Post('request-reset-password')
  @HttpCode(HttpStatus.OK)
  @ZodValidation(resetPasswordRequestSchema)
  async resetUserPasswordRequest(@Body() body: { email: string }) {
    return await this.authService.resetUserPasswordRequest({
      email: body.email,
    });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ZodValidation(resetPasswordSchema)
  async resetUserPassword(@Body() resetPasswordDto: ResetUserPasswordDto) {
    return await this.authService.resetUserPassword({
      resetPasswordDto,
    });
  }

  @Get('verify-reset-password-token')
  @HttpCode(HttpStatus.OK)
  @ZodValidation(tokenQuerySchema)
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
  @ZodValidation(googleCallbackSchema)
  async googleAuthCallback(@Body('accessToken') accessToken: string) {
    try {
      // Handle Google OAuth2 callback and get user info
      const user = await this.googleService.googleCallback(accessToken);

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
      throw new ConflictException(ERRORS.GOOGLE_AUTH_FAILED, error.message);
    }
  }

  @UseGuards(AuthGuard('facebook'))
  @Get('facebook/login')
  async facebookAuth() {
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
