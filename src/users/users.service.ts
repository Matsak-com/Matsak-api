import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { fileSchema } from './utils/file-utils';
import { AwsS3Service } from '../aws/aws-s3.service';
import { z } from 'zod';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private awsS3Service: AwsS3Service,
  ) {}

  async getUsers(): Promise<any> {
    const users = await this.userModel.find(
      {},
      'id email firstName avatarFileKey',
    );

    const usersWithAvatar = await Promise.all(
      users.map(async (user) => {
        let avatarUrl = '';
        if (user.avatarFileKey) {
          avatarUrl = await this.awsS3Service.getFileUrl({
            fileKey: user.avatarFileKey,
          });
        }
        return { ...user, avatarUrl };
      }),
    );

    return usersWithAvatar;
  }

  async getUser({ userId }: { userId: string }): Promise<any> {
    const user = await this.userModel.findOne(
      { id: userId },
      'id email firstName avatarFileKey',
    );

    let avatarUrl = '';
    if (user.avatarFileKey) {
      avatarUrl = await this.awsS3Service.getFileUrl({
        fileKey: user.avatarFileKey,
      });
    }
    return { ...user, avatarUrl };
  }

  async findOne({
    query,
  }: {
    query: Partial<User>;
  }): Promise<User | undefined> {
    return this.userModel.findOne({ query }).exec();
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async updateUser({
    userId,
    submittedFile,
  }: {
    userId: string;
    submittedFile: z.infer<typeof fileSchema>;
  }) {
    try {
      const existingUser = await this.userModel.findOne(
        { _id: userId },
        'avatarFileKey',
      );
      if (!existingUser) {
        throw new HttpException('User not exists', HttpStatus.BAD_REQUEST);
      }

      const { fileKey } = await this.awsS3Service.uploadFile({
        file: submittedFile,
      });

      await this.userModel.updateOne({
        _id: userId,
        avatarFileKey: fileKey,
      });

      if (existingUser.avatarFileKey) {
        await this.awsS3Service.deleteFile({
          fileKey: existingUser.avatarFileKey,
        });
      }
      return {
        error: false,
        message: "L'avatar a bien été mis à jour",
      };
    } catch (error) {
      if (error instanceof Error) {
        return { error: true, message: error.message };
      }
      return { error: true, message: 'Une erreur inattendue est survenue' };
    }
  }

  async update(
    query: Partial<User>,
    updateUserDto: Partial<CreateUserDto>,
  ): Promise<User> {
    const user = await this.findOne({ query });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    Object.assign(user, updateUserDto);
    return user.save();
  }

  async delete(id: string): Promise<void> {
    const user = await this.findOne({ query: { _id: id } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    await this.userModel.deleteOne({ _id: id }).exec();
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (user && isMatch) {
      const { password, ...result } = user; // Remove password from returned object
      return result;
    }
    return null;
  }
}
