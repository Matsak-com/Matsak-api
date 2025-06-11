import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { fileSchema } from './utils/file-utils';
import { AwsS3Service } from '../aws/aws-s3.service';
import { z } from 'zod';
import { UpdateUserDto } from 'src/auth/dto/update-user.dto';
import { UpdatePasswordDto } from 'src/auth/dto/update-password.dto';

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
      { _id: userId },
      'id name firstname email password firstName avatarFileKey',
    );

    // Check if the user was found
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
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

  // MISE A JOUR AVATAR DE L'USER

  // async updateUser({
  //   userId,
  //   submittedFile,
  // }: {
  //   userId: string;
  //   submittedFile: z.infer<typeof fileSchema>;
  // }) {
  //   try {
  //     const existingUser = await this.userModel.findOne(
  //       { _id: userId },
  //       'avatarFileKey',
  //     );
  //     if (!existingUser) {
  //       throw new HttpException('User not exists', HttpStatus.BAD_REQUEST);
  //     }

  //     const { fileKey } = await this.awsS3Service.uploadFile({
  //       file: submittedFile,
  //     });

  //     await this.userModel.updateOne({
  //       _id: userId,
  //       avatarFileKey: fileKey,
  //     });

  //     if (existingUser.avatarFileKey) {
  //       await this.awsS3Service.deleteFile({
  //         fileKey: existingUser.avatarFileKey,
  //       });
  //     }
  //     return {
  //       error: false,
  //       message: "L'avatar a bien été mis à jour",
  //     };
  //   } catch (error) {
  //     if (error instanceof Error) {
  //       return { error: true, message: error.message };
  //     }
  //     return { error: true, message: 'Une erreur inattendue est survenue' };
  //   }
  // }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto & UpdatePasswordDto,
  ): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Mise à jour du profil (name, firstname, email)
    if (updateUserDto.name || updateUserDto.firstname || updateUserDto.email) {
      user.name = updateUserDto.name || user.name;
      user.firstname = updateUserDto.firstname || user.firstname;
      user.email = updateUserDto.email || user.email;
    }

    // Mise à jour du mot de passe (si un mot de passe est fourni)
    if (updateUserDto.currentPassword && updateUserDto.newPassword) {
      // Vérifier si le mot de passe actuel est correct
      const isPasswordValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash du nouveau mot de passe
      user.password = await bcrypt.hash(updateUserDto.newPassword, 10);
    }

    // Sauvegarde des informations mises à jour
    await user.save();
    return {
      message: 'Profile and/or password updated successfully',
    };
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
