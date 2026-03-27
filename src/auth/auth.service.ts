import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
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

const RESET_TOKEN_TTL_MINUTES = 30;
const RESET_REQUEST_LIMIT = 3;
const RESET_REQUEST_WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

      const userToCreate = {
        ...createUserDto,
        role: 'user' as UserRole,
      };

      // Create user
      const createdUser = await this.usersService.create(userToCreate);

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
    return this.forgotPassword({ email });
  }

  async forgotPassword({ email }: { email: string }) {
    const genericResponse = {
      success: true,
      message:
        'If an account exists for this email, a password reset link has been sent.',
    };

    try {
      const existingUser = await this.usersService.findByEmail(email);

      if (!existingUser) {
        return genericResponse;
      }

      const now = new Date();
      const windowStart = existingUser.resetPasswordRequestWindow
        ? new Date(existingUser.resetPasswordRequestWindow)
        : null;

      const isWithinWindow = Boolean(
        windowStart &&
        now.getTime() - windowStart.getTime() < RESET_REQUEST_WINDOW_MS,
      );

      const requestCount = isWithinWindow
        ? existingUser.resetPasswordRequestCount || 0
        : 0;

      if (requestCount >= RESET_REQUEST_LIMIT) {
        this.logger.warn(`Reset password rate limit reached for ${email}`);
        return genericResponse;
      }

      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(
        now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
      );

      await this.usersService.update({ _id: existingUser._id }, {
        isResettingPassword: true,
        resetPasswordTokenHash: tokenHash,
        resetPasswordTokenExpiresAt: expiresAt,
        resetPasswordRequestCount: requestCount + 1,
        resetPasswordRequestWindow: isWithinWindow ? windowStart : now,
      } as any);

      await this.sendResetPasswordEmail({
        user: existingUser,
        rawToken,
      });

      return genericResponse;
    } catch (error) {
      this.logger.error(
        `Failed to process forgot password for ${email}: ${error.message}`,
      );
      return genericResponse;
    }
  }

  private async sendResetPasswordEmail({
    user,
    rawToken,
  }: {
    user: User;
    rawToken: string;
  }) {
    const locale = this.getUserLocale(user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

    const subject =
      this.i18nService.translate('email.resetPassword.subject', locale) ||
      'Reset your password';

    await this.notificationService.sendEmail({
      to: user.email,
      subject,
      template: 'reset-password',
      locale,
      context: {
        user: {
          firstName: user.firstname,
          lastName: user.name,
          email: user.email,
        },
        resetUrl,
        minutes: RESET_TOKEN_TTL_MINUTES,
      },
    });
  }

  async verifyResetPasswordToken({ token }: { token: string }) {
    try {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const existingUser = await this.usersService.findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordTokenExpiresAt: { $gt: new Date() },
      });

      if (!existingUser || existingUser.isResettingPassword === false) {
        throw new HttpException(
          'Reset token is invalid or expired.',
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
      const { newPassword, token } = resetPasswordDto;
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const existingUser = await this.usersService.findOne({
        resetPasswordTokenHash: tokenHash,
      });

      if (!existingUser) {
        throw new HttpException(
          'Reset token is invalid.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        !existingUser.resetPasswordTokenExpiresAt ||
        existingUser.resetPasswordTokenExpiresAt < new Date()
      ) {
        throw new HttpException(
          'Reset token is invalid or expired.',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.usersService.update({ _id: existingUser._id }, {
        isResettingPassword: false,
        password: newPassword,
        resetPasswordTokenHash: null,
        resetPasswordTokenExpiresAt: null,
        resetPasswordRequestCount: 0,
        resetPasswordRequestWindow: null,
      } as any);

      // Send confirmation email (non-blocking)
      this.sendPasswordChangedConfirmationEmail({ user: existingUser }).catch(
        (err) =>
          this.logger.warn(
            `Failed to send password change confirmation email: ${err.message}`,
          ),
      );

      return {
        error: false,
        message: 'Votre mot de passe a bien été changé.',
      };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  /**
   * Send a confirmation email after a successful password reset.
   */
  private async sendPasswordChangedConfirmationEmail({
    user,
  }: {
    user: User;
  }): Promise<void> {
    const locale = this.getUserLocale(user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginUrl = `${frontendUrl}/auth/login`;
    const ns = 'email.resetPasswordConfirmation';

    // Pre-resolve all translations with hard-coded fallbacks so the email
    // renders correctly even if the i18n service hasn't finished initializing.
    const tr = (key: string, fallback: string): string =>
      this.i18nService.translate(`${ns}.${key}`, locale) || fallback;

    const subject = tr('subject', 'Your password has been changed');

    const changedAt = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    const t = {
      greeting: tr('greeting', 'Hello'),
      title: tr('title', 'Password Changed Successfully'),
      description: tr(
        'description',
        'Your Matsak account password has been successfully updated. You can now log in with your new password.',
      ),
      accountLabel: tr('accountLabel', 'Account'),
      changedAt: tr('changedAt', 'Changed on'),
      noActionNeeded: tr(
        'noActionNeeded',
        'If you authorized this change, no further action is required — your account is up to date.',
      ),
      loginButton: tr('loginButton', 'Log in to my account'),
      notYou: tr('notYou', "Didn't make this change?"),
      notYouAction: tr(
        'notYouAction',
        'If you did not change your password, your account may have been compromised. Please contact our support team immediately to secure your account.',
      ),
      contactSupport: tr(
        'contactSupport',
        'Contact our support team immediately at',
      ),
      signature: tr('signature', 'Best regards,<br>The Matsak Team'),
    };

    await this.notificationService.sendEmail({
      to: user.email,
      subject,
      template: 'reset-password-confirmation',
      locale,
      context: {
        t,
        user: {
          firstName: user.firstname,
          lastName: user.name,
          email: user.email,
        },
        changedAt,
        loginUrl,
        platform: {
          name: process.env.APP_NAME || 'Matsak',
          url: frontendUrl,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@matsak-mg.com',
          contactEmail: process.env.CONTACT_EMAIL || 'contact@matsak-mg.com',
          logoUrl: `${frontendUrl}/images/logos/matsak-logo.svg`,
        },
        year: new Date().getFullYear(),
      },
    });
  }
}
