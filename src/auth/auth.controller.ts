import { Controller, Post, Body, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
        const user = await this.usersService.register(createUserDto);
        return { message: 'User registered successfully', user };
      } catch (error) {
        if (error.status === 409) {
          throw new ConflictException(error.message);
        }
        throw error; // Re-throw other errors
      }
  }
  

  @Post('login')
  async login(
    @Body() loginDto: CreateUserDto
  ) {
    return this.authService.login(loginDto);
  }
}
