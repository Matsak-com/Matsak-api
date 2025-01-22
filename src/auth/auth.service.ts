import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LogUserDto } from './dto/log-user.dto';
import { UserPayload } from './jwt/jwt.strategy';
import { hash } from 'bcrypt';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login({loginDto}: {loginDto: LogUserDto}): Promise<{ accessToken: string }> {
    try
    {
      const user = await this.usersService.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.authenticateUser({
        userId: user._doc._id,
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async register({createUserDto} : {createUserDto: CreateUserDto}) {
      try {
        const existingUser = await this.usersService.findByEmail(createUserDto.email);
        if (existingUser) {
        if (existingUser.name === createUserDto.name)
          throw new HttpException('user already exists', HttpStatus.CONFLICT);
        if (existingUser.email === createUserDto.email)
          throw new HttpException('Email already exists', HttpStatus.CONFLICT);
        }
        const hashedPassword = await this.hashPassword({password: createUserDto.password});
        const createdUser = await this.usersService.create({...createUserDto, password: hashedPassword});
        
        // await this.mailerService.sendCreatedAccountEmail({
        //   firstName,
        //   recipient: email,
        // });

        return this.authenticateUser({
        userId: createdUser.id,
        });
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

  private async hashPassword({ password }: { password: string }) {
    const hashedPassword = await hash(password, 10);
    return hashedPassword;
  }
  
  private async authenticateUser({ userId }: UserPayload) {
    const payload = { userId };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }

  async resetUserPasswordRequest({ email }: { email: string }) {
    try {
      const existingUser = await this.usersService.findByEmail(email);

      if (!existingUser) {
        throw new HttpException('user already exists', HttpStatus.CONFLICT);
      }

      if (existingUser.isResettingPassword === true) {
        throw new Error('A password reset request is already in progress. Please check your emails.');
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
        message:
          'Please check your email to reset your password.',
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyResetPasswordToken({ token }: { token: string }) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          resetPasswordToken: token,
        },
      });

      if (!existingUser) {
        throw new Error("L'utilisateur n'existe pas.");
      }

      if (existingUser.isResettingPassword === false) {
        throw new Error(
          "Aucune demande de réinitialisation de mot de passe n'est en cours.",
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
      const existingUser = await this.prisma.user.findUnique({
        where: {
          resetPasswordToken: token,
        },
      });

      if (!existingUser) {
        throw new Error("L'utilisateur n'existe pas.");
      }

      if (existingUser.isResettingPassword === false) {
        throw new Error(
          "Aucune demande de réinitialisation de mot de passe n'est en cours.",
        );
      }

      const hashedPassword = await this.hashPassword({
        password,
      });
      await this.prisma.user.update({
        where: {
          resetPasswordToken: token,
        },
        data: {
          isResettingPassword: false,
          password: hashedPassword,
        },
      });

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
