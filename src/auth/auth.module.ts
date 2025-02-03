import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { UsersService } from 'src/users/users.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      global: true,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, UsersService, MailerService],
  controllers: [AuthController],
})
export class AuthModule {}
