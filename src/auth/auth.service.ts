import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/log-user.dto';
import { UserPayload } from './jwt/jwt.strategy';
import { hash } from 'bcrypt';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { User, UserRole } from '../users/user.schema';
import { NotificationService } from 'src/notifications/notification.service';
import { I18nService } from 'src/notifications/i18n.service';

type SupportedLocale = 'en' | 'fr' | 'zh' | 'ar';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
    private i18nService: I18nService,
  ) {}

  async login({ loginDto }: { loginDto: LogUserDto }): Promise<{
    accessToken: string;
    user: string;
    role: UserRole;
    locale?: 'en' | 'fr' | 'zh' | 'ar';
    current_team?: string | null;
  }> {
    try {
      let user = null;
      if (loginDto.provider) {
        user = await this.usersService.findByEmail(loginDto.email);
      } else {
        user = await this.usersService.validateUser(
          loginDto.email,
          loginDto.password,
        );
      }
      if (!user) {
        throw new UnauthorizedException(ERRORS.INVALID_CREDENTIALS);
      }

      // Get user with current_team populated
      const fullUser = await this.usersService.findOne({ _id: user._id });

      const authResponse = await this.authenticateUser({
        userId: user._id,
        role: user.role,
        current_team: fullUser?.current_team?.toString() || null,
      });

      return {
        ...authResponse,
        user: user._id.toString(),
        role: user.role,
        locale: fullUser?.locale || 'fr',
        current_team: fullUser?.current_team?.toString() || null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new HttpException(
        error.message || ERRORS.INTERNAL_SERVER_ERROR,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async register(createUserDto: CreateUserDto): Promise<{
    accessToken: string;
    user: string;
    role: UserRole;
    current_team?: string | null;
    message: string;
    warnings?: string[];
  }> {
    try {
      // Check if user already exists
      const existingUser = await this.usersService.findByEmail(
        createUserDto.email,
      );

      if (existingUser) {
        throw new HttpException(
          ERRORS.USER_ALREADY_EXISTS,
          HttpStatus.CONFLICT,
        );
      }

      // Create user
      const createdUser = await this.usersService.create(createUserDto);

      if (!createdUser) {
        throw new HttpException(
          ERRORS.USER_CREATION_FAILED,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Fetch full user details
      const fullUser = await this.usersService.findOne({
        _id: createdUser._id,
      });

      // Generate token JWT
      const authResponse = await this.authenticateUser({
        userId: createdUser._id.toString(),
        role: createdUser.role,
        current_team: fullUser?.current_team?.toString() || null,
      });

      const warnings: string[] = [];

      // SEND WELCOME EMAIL
      try {
        await this.sendWelcomeEmail(createdUser);
      } catch (emailError: any) {
        console.warn(`Échec de l'email de bienvenue: ${emailError.message}`);
        warnings.push(
          `L'email de bienvenue n'a pas pu être envoyé: ${emailError.message}`,
        );

        this.retryWelcomeEmailLater(createdUser).catch(() => {
          console.error("La retentative d'envoi d'email a également échoué");
        });
      }

      return {
        ...authResponse,
        user: createdUser._id.toString(),
        role: createdUser.role,
        current_team: fullUser?.current_team?.toString() || null,
        message: 'User registered successfully',
        ...(warnings.length > 0 && { warnings }),
      };
    } catch (error) {
      if (error.status === HttpStatus.CONFLICT) {
        throw error;
      }
      throw new HttpException(
        error.message || ERRORS.REGISTRATION_FAILED,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Resend email
   */
  private async retryWelcomeEmailLater(user: any): Promise<void> {
    // Wait for 30 seconds
    await new Promise((resolve) => setTimeout(resolve, 30000));

    try {
      await this.sendWelcomeEmail(user);
    } catch (retryError) {
      console.error(`Échec de la retentative d'email: ${retryError.message}`);
    }
  }

  /**
   * Send welcome email to a user with translations
   */
  private async sendWelcomeEmail(user: any): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      const locale = this.getUserLocale(user);

      // Obtenir le sujet traduit
      const translatedSubject = this.getTranslatedWelcomeSubject(locale, user);

      // UTILISEZ INTL DIRECTEMENT (sans import de dayjs.util.ts)
      const currentDate = new Intl.DateTimeFormat(locale, {
        weekday: ['fr', 'en'].includes(locale) ? 'long' : undefined,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());

      const joinDate = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(user.createdAt || new Date());

      await this.notificationService.sendEmail({
        to: user.email,
        subject: translatedSubject,
        template: 'welcome',
        context: {
          user: {
            firstName: user.firstname,
            lastName: user.name,
            email: user.email,
            id: user._id.toString(),
            joinDate: joinDate,
          },
          platform: {
            name: process.env.APP_NAME || 'Our Platform',
            url: process.env.FRONTEND_URL || 'http://localhost:3000',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@matsak-mg.com',
            contactEmail: process.env.CONTACT_EMAIL || 'contact@matsak-mg.com',
            logoUrl: `${frontendUrl}/images/logos/matsak-logo.svg`,
          },
          year: new Date().getFullYear(),
          currentDate: currentDate,
        },
        locale: locale,
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  /**
   * Get translated welcome subject using i18n service
   */
  private getTranslatedWelcomeSubject(
    locale: SupportedLocale,
    user: any,
  ): string {
    try {
      const translations = this.i18nService.getTranslations(
        'email.welcome',
        locale,
        {
          platformName: process.env.APP_NAME || 'Our Platform',
          userName: user.firstname || user.name || 'User',
        },
      );

      return translations.subject || translations.welcomeSubject;
    } catch (error) {
      console.warn(`Failed to get i18n translation: ${error.message}`);
      return this.getFallbackWelcomeSubject(locale);
    }
  }

  /**
   * Fallback welcome subjects if i18n fails
   */
  private getFallbackWelcomeSubject(locale: SupportedLocale): string {
    const fallbackSubjects: Record<SupportedLocale, string> = {
      fr: 'Bienvenue sur Notre Plateforme !',
      en: 'Welcome to Our Platform!',
      zh: '欢迎来到我们的平台！',
      ar: 'مرحباً بكم في منصتنا!',
    };

    return fallbackSubjects[locale] || fallbackSubjects.fr;
  }

  /**
   * Determine user locale - toujours retourner une locale supportée
   */
  private getUserLocale(user: any): SupportedLocale {
    if (user.locale && ['en', 'fr', 'zh', 'ar'].includes(user.locale)) {
      return user.locale as SupportedLocale;
    }
    return 'fr';
  }

  async updateUserLocale(
    userId: string,
    locale: 'en' | 'fr' | 'zh' | 'ar',
  ): Promise<User> {
    try {
      const updatedUser = await this.usersService.update(
        { _id: userId },
        { locale },
      );

      if (!updatedUser) {
        throw new HttpException(ERRORS.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      return updatedUser;
    } catch (error) {
      throw new HttpException(
        error.message || ERRORS.INTERNAL_SERVER_ERROR,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async authenticateUser({
    userId,
    role,
    current_team,
  }: UserPayload): Promise<{
    accessToken: string;
  }> {
    const payload = {
      userId,
      role,
      current_team,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }

  private async hashPassword({ password }: { password: string }) {
    const hashedPassword = await hash(password, 10);
    return hashedPassword;
  }

  async resetUserPasswordRequest({ email }: { email: string }) {
    try {
      const existingUser = await this.usersService.findByEmail(email);

      if (!existingUser) {
        throw new HttpException(ERRORS.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (existingUser.isResettingPassword === true) {
        throw new HttpException(
          ERRORS.RESET_ALREADY_IN_PROGRESS,
          HttpStatus.BAD_REQUEST,
        );
      }

      const createdId = uuidv4();
      await this.usersService.update(existingUser.id, {
        isResettingPassword: true,
        resetPasswordToken: createdId,
      });

      return {
        error: false,
        message: 'Please check your email to reset your password.',
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyResetPasswordToken({ token }: { token: string }) {
    try {
      const existingUser = await this.usersService.findOne({
        query: { resetPasswordToken: token },
      });

      if (!existingUser) {
        throw new HttpException(ERRORS.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (existingUser.isResettingPassword === false) {
        throw new HttpException(
          ERRORS.RESET_NOT_REQUESTED,
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        error: false,
        message: 'Le token est valide et peut être utilisé.',
      };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async resetUserPassword({
    resetPasswordDto,
  }: {
    resetPasswordDto: ResetUserPasswordDto;
  }) {
    try {
      const { password, token } = resetPasswordDto;
      const existingUser = await this.usersService.findOne({
        query: { resetPasswordToken: token },
      });

      if (!existingUser) {
        throw new HttpException(ERRORS.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (existingUser.isResettingPassword === false) {
        throw new HttpException(
          ERRORS.RESET_NOT_REQUESTED,
          HttpStatus.BAD_REQUEST,
        );
      }

      const hashedPassword = await this.hashPassword({
        password,
      });
      await this.usersService.update(
        { resetPasswordToken: token },
        {
          isResettingPassword: false,
          password: hashedPassword,
        },
      );

      return {
        error: false,
        message: 'Votre mot de passe a bien été changé.',
      };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }
}
