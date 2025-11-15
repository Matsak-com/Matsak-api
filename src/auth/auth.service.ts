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
import { UserRole } from 'src/users/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login({ loginDto }: { loginDto: LogUserDto }): Promise<{
    accessToken: string;
    user: any;
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
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async register({ createUserDto }: { createUserDto: CreateUserDto }) {
    try {
      const existingUser = await this.usersService.findByEmail(
        createUserDto.email,
      );

      if (existingUser) {
        if (existingUser.name === createUserDto.name) {
          throw new HttpException(
            ERRORS.USER_ALREADY_EXISTS,
            HttpStatus.CONFLICT,
          );
        }
        if (existingUser.email === createUserDto.email) {
          throw new HttpException(
            ERRORS.EMAIL_ALREADY_EXISTS,
            HttpStatus.CONFLICT,
          );
        }
      }

      // On ne hache pas le mot de passe ici
      const createdUser = await this.usersService.create({
        ...createUserDto,
        password: createUserDto.password, // Stockage direct du mot de passe sans hash
      });

      return createdUser;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async hashPassword({ password }: { password: string }) {
    const hashedPassword = await hash(password, 10);
    return hashedPassword;
  }

  private async authenticateUser({ userId, role, current_team }: UserPayload) {
    const payload = { userId, role, current_team };
    return { accessToken: await this.jwtService.signAsync(payload) };
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
      // return this.authenticateUser({
      //   userId: existingUser.id,
      // });
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
      // return this.authenticateUser({
      //   userId: existingUser.id,
      // });
    } catch (error) {
      return { error: true, message: error.message };
    }
  }
}
