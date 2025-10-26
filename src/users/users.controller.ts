import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from 'src/auth/dto/update-user.dto';
import { UpdatePasswordDto } from 'src/auth/dto/update-password.dto';
import { UsersService } from './users.service';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import {
  userIdParamSchema,
  updateUserSchema,
  updatePasswordSchema,
} from '../common/schemas/auth.schemas';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:userId')
  @CompoundZodValidation({ params: userIdParamSchema })
  getUser(@Param() params: { userId: string }) {
    return this.usersService.getUser(params.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/:userId')
  @UseInterceptors(FileInterceptor('avatar'))
  @CompoundZodValidation({
    params: userIdParamSchema,
    body: updateUserSchema.merge(updatePasswordSchema).partial(),
  })
  async updateUser(
    @Param() params: { userId: string },
    @Body() updateUserDto: UpdateUserDto & UpdatePasswordDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      return await this.usersService.updateUser(
        params.userId,
        updateUserDto,
        file,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Error updating user',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}