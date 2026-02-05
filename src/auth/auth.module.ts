import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { AwsS3Service } from '../aws/aws-s3.service';
import { UsersModule } from '../users/users.module';
import { GoogleStrategy } from '../sso/google/google.strategy';
import { FacebookStrategy } from '../sso/facebook/facebook.strategy';
import { GoogleService } from '../sso/google/google.service';
import { NotificationModule } from 'src/notifications/notification.module';
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      global: true,
      signOptions: { expiresIn: '30d' },
    }),
    UsersModule,
    NotificationModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    AwsS3Service,
    GoogleStrategy,
    FacebookStrategy,
    GoogleService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
