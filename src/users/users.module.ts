import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UserController } from './users.controller';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { UserRepository } from './users.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService, AwsS3Service, UserRepository],
  controllers: [UserController],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
