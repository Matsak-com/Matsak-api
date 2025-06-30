import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from 'src/auth/dto/update-user.dto';
import { UpdatePasswordDto } from 'src/auth/dto/update-password.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:userId')
  getUser(@Param('userId') userId: string) {
    return this.usersService.getUser({ userId });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto & UpdatePasswordDto,
  ) {
    try {
      return await this.usersService.updateUser(userId, updateUserDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error updating user',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
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