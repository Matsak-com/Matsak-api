import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      global: true,
      signOptions: { expiresIn: '30d' },
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, AwsS3Service],
  controllers: [AuthController],
})
export class AuthModule {}
