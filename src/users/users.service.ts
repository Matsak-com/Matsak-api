import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from '../auth/dto/create-user.dto';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { UpdatePasswordDto } from '../auth/dto/update-password.dto';
import { AwsS3Service } from '../aws/aws-s3.service';
import { User } from './user.schema';
import { UserRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async getUsers(): Promise<any[]> {
    const users = await this.userRepository.findAll({
      filter: {},
      options: {
        projection: { _id: 1, email: 1, firstName: 1, avatarFileKey: 1 },
      },
    });

    return Promise.all(
      users.map(async (user) => {
        const avatarUrl = user.avatarFileKey
          ? await this.awsS3Service.getFileUrl({ fileKey: user.avatarFileKey })
          : '';
        return { ...user.toObject(), avatarUrl };
      }),
    );
  }

  async getUser({ userId }: { userId: string }): Promise<any> {
    const user = await this.userRepository.findOne({
      filter: { _id: userId },
      options: {
        projection: {
          _id: 1,
          name: 1,
          firstname: 1,
          email: 1,
          password: 1,
          firstName: 1,
          avatarFileKey: 1,
        },
      },
    });

    // Check if the user was found
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let avatarUrl = '';
    if (user.avatarFileKey) {
      try {
        avatarUrl = await this.awsS3Service.getFileUrl({
          fileKey: user.avatarFileKey,
        });
      } catch (error) {
        console.error(`Error fetching avatar for user ${userId}:`, error);
      }
    }

    // Return the user with the avatarUrl
    const userObj = user.toObject();
    delete userObj.password;
    return { ...userObj, avatarUrl };
  }

  async findOne(query: Record<string, any>): Promise<User | null> {
    return this.userRepository.findOne({ filter: query });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ filter: { email } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.userRepository.create({
      doc: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto & UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.name || updateUserDto.firstname || updateUserDto.email) {
      user.name = updateUserDto.name ?? user.name;
      user.firstname = updateUserDto.firstname ?? user.firstname;
      user.email = updateUserDto.email ?? user.email;
    }

    if (updateUserDto.currentPassword && updateUserDto.newPassword) {
      const isPasswordValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      user.password = await bcrypt.hash(updateUserDto.newPassword, 10);
    }

    await user.save();

    return {
      message: 'Profile and/or password updated successfully',
    };
  }

  async update(
    query: Record<string, any>,
    updateUserDto: Partial<CreateUserDto>,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ filter: query });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return user.save();
  }

  async delete(id: string): Promise<void> {
    const user = await this.findOne({ _id: id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.delete({ id });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    const obj = user.toObject();
    delete (obj as any).password;
    return obj;
  }

  // Optional: Avatar update
  // async updateUserAvatar({ userId, submittedFile }: {
  //   userId: string;
  //   submittedFile: z.infer<typeof fileSchema>;
  // }) {
  //   try {
  //     const existingUser = await this.userRepository.findById(userId, {
  //       projection: { avatarFileKey: 1 },
  //     });
  //     if (!existingUser) {
  //       throw new HttpException('User not exists', HttpStatus.BAD_REQUEST);
  //     }

  //     const { fileKey } = await this.awsS3Service.uploadFile({ file: submittedFile });

  //     // Supprimer l'ancien avatar
  //     if (existingUser.avatarFileKey) {
  //       await this.awsS3Service.deleteFile({ fileKey: existingUser.avatarFileKey });
  //     }

  //     existingUser.avatarFileKey = fileKey;
  //     await existingUser.save();

  //     return { error: false, message: "Avatar updated successfully" };
  //   } catch (error) {
  //     return {
  //       error: true,
  //       message: error instanceof Error ? error.message : 'Unexpected error occurred',
  //     };
  //   }
  // }
}
