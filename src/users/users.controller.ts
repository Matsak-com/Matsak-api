import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
// import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestWithUser } from 'src/auth/jwt/jwt.strategy';
import { fileSchema } from './utils/file-utils';
import { UsersService } from './users.service';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import { UpdateUserDto } from 'src/auth/dto/update-user.dto';
import { UpdatePasswordDto } from 'src/auth/dto/update-password.dto';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}
  @Get()
  // localhost:8080/users
  getUsers() {
    return this.usersService.getUsers();
  }

  @Get('/:userId')
  // localhost:8080/users/3000
  getUser(@Param('userId') userId: string) {
    return this.usersService.getUser({
      userId,
    });
  }

  // MISE A JOUR AVATAR USER 

  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(FileInterceptor('avatar'))
  // @Post()
  // async updateUser(
  //   @Req() requestWithUser: RequestWithUser,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   const submittedFile = fileSchema.parse(file);
  //   return this.usersService.updateUser({
  //     userId: requestWithUser.user.userId,
  //     submittedFile,
  //   });
  // }


  @UseGuards(JwtAuthGuard)
  @Patch('/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto & UpdatePasswordDto,
  ) {
    try {
      return await this.usersService.updateUser(userId, updateUserDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }


  
}
