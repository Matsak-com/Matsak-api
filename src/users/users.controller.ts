import {
    Controller,
    Get,
    Param,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
  import { RequestWithUser } from 'src/auth/jwt/jwt.strategy';
  import { fileSchema } from './utils/file-utils';
  import { UsersService } from './users.service';
  
  @Controller('users')
  export class UserController {
    constructor(private readonly usersService: UsersService) {}
    @Get()
    // localhost:3000/users
    getUsers() {
      return this.usersService.getUsers();
    }
  
    @Get('/:userId')
    // localhost:3000/users/3000
    getUser(@Param('userId') userId: string) {
      return this.usersService.getUser({
        userId,
      });
    }
  
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('avatar'))
    @Post()
    async updateUser(
      @Req() requestWithUser: RequestWithUser,
      @UploadedFile() file: Express.Multer.File,
    ) {
      const submittedFile = fileSchema.parse(file);
      return this.usersService.updateUser({
        userId: requestWithUser.user.userId,
        submittedFile,
      });
    }
  }