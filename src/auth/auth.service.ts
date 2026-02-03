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
import { UserRole } from '../users/user.schema';
import { NotificationService } from 'src/notifications/notification.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
  ) {}

  async login({ loginDto }: { loginDto: LogUserDto }): Promise<{
    accessToken: string;
    user: string;
    role: UserRole;
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
        user: user._id,
        role: user.role,
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
  }> {
    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.usersService.findByEmail(
        createUserDto.email,
      );

      if (existingUser) {
        throw new HttpException(
          ERRORS.USER_ALREADY_EXISTS,
          HttpStatus.CONFLICT,
        );
      }

      // Créer l'utilisateur
      const createdUser = await this.usersService.create(createUserDto);
      
      if (!createdUser) {
        throw new HttpException(
          ERRORS.USER_CREATION_FAILED,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Récupérer l'utilisateur complet
      const fullUser = await this.usersService.findOne({ _id: createdUser._id });

      // Générer le token JWT
      const authResponse = await this.authenticateUser({
        userId: createdUser._id.toString(),
        role: createdUser.role,
        current_team: fullUser?.current_team?.toString() || null,
      });

      // ENVOYER L'EMAIL DE BIENVENUE via NotificationService
      await this.sendWelcomeEmail(createdUser);

      return {
        ...authResponse,
        user: createdUser._id.toString(),
        role: createdUser.role,
        current_team: fullUser?.current_team?.toString() || null,
        message: 'User registered successfully',
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
   * Envoie l'email de bienvenue
   */
  private async sendWelcomeEmail(user: any): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      // Utiliser le template 'welcome' avec le contexte approprié
      await this.notificationService.sendEmail({
        to: user.email,
        subject: 'Welcome to Our Platform!', 
        template: 'welcome',
        context: {
          // Données pour le template
          user: {
            firstName: user.firstname,
            lastName: user.name,
            email: user.email,
            id: user._id.toString(),
            joinDate: new Date().toISOString(),
          },
          platform: {
            name: process.env.APP_NAME || 'Our Platform',
            url: process.env.FRONTEND_URL || 'http://localhost:3000',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
            contactEmail: process.env.CONTACT_EMAIL || 'contact@example.com',
            logoUrl: `${frontendUrl}/images/logos/matsak-logo.svg`, 
          },
          // Variables pour le layout
          year: new Date().getFullYear(),
          currentDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        },
        locale: 'en',
      });

      console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  private async authenticateUser({ userId, role, current_team }: UserPayload): Promise<{
    accessToken: string;
  }> {
    const payload = { 
      userId, 
      role, 
      current_team 
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
      // await this.mailerService.sendRequestedPasswordEmail({
      //   firstName: existingUser.firstName,
      //   recipient: existingUser.email,
      //   token: createdId,
      // });

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