import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UserController } from './users.controller';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { UserRepository } from './users.repository';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Member, MemberSchema } from '../members/member.schema';
import { MemberRepository } from '../members/member.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Member.name, schema: MemberSchema },
    ]),
    MulterModule.register({
      storage: memoryStorage(), // Stocker en mémoire pour upload vers S3
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Type de fichier non autorisé. Formats acceptés: JPG, PNG, GIF, WEBP',
            ),
            false,
          );
        }
      },
    }),
  ],
  providers: [UsersService, AwsS3Service, UserRepository, MemberRepository],
  controllers: [UserController],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
