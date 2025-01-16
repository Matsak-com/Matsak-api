import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async register(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userModel.findOne({ $or: [{ name: createUserDto.name }, { firstname: createUserDto.firstname }, { email: createUserDto.email }] }).exec();
    if (existingUser) {
      if (existingUser.name === createUserDto.name)
        throw new HttpException('user already exists', HttpStatus.CONFLICT);
      if (existingUser.email === createUserDto.email)
        throw new HttpException('Email already exists', HttpStatus.CONFLICT);
    }
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async findOne(id: string): Promise<User | undefined> {
    return this.userModel.findOne({ _id: id }).exec();
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.userModel.findOne({ email }).exec();
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