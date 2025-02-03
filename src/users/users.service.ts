import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async getUsers() {
    const users = await this.userModel.find({
        id: true,
        email: true,
        firstName: true,
        avatarFileKey: true,
    });

    // const usersWithAvatar = await Promise.all(
    //   users.map(async (user) => {
    //     let avatarUrl = '';
    //     if (user.avatarFileKey) {
    //       avatarUrl = await this.awsS3Service.getFileUrl({
    //         fileKey: user.avatarFileKey,
    //       });
    //     }
    //     return { ...user, avatarUrl };
    //   }),
    // );

    // return usersWithAvatar;
    return users;
  }

  async getUser({ userId }: { userId: string }) {
    const user = await this.userModel.findOne(
      {id: userId},
      'id email firstName avatarFileKey'
    );
    return user;
  }

  async findOne(query: Partial<User>): Promise<User | undefined> {
    return this.userModel.findOne({query}).exec();
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

  async update(id: string, updateUserDto: Partial<CreateUserDto>): Promise<User> {
    const user = await this.findOne({id});
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
    const user = await this.findOne({id});
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