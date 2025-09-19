import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from 'src/auth/dto/update-user.dto';
import { UpdatePasswordDto } from 'src/auth/dto/update-password.dto';

describe('UserController', () => {
  let controller: UserController;
  let usersService: UsersService;

  const mockUsersService = {
    getUsers: jest.fn(() => ['user1', 'user2']),
    getUser: jest.fn((id) => ({ id, name: 'John Doe' })),
    updateUser: jest.fn((id, dto) => ({ id, ...dto })),
  };

  const mockAuthGuard = {
    canActivate: () => true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<UserController>(UserController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return all users', () => {
      expect(controller.getUsers()).toEqual(['user1', 'user2']);
      expect(usersService.getUsers).toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('should return a user by id', () => {
      const userId = 'abc123';
      expect(controller.getUser({ userId })).toEqual({
        id: { userId },
        name: 'John Doe',
      });
      expect(usersService.getUser).toHaveBeenCalledWith({ userId });
    });
  });

  describe('updateUser', () => {
    it('should update and return the user', async () => {
      const userId = 'abc123';
      const updateDto: UpdateUserDto & UpdatePasswordDto = {
        email: 'new@email.com',
        name: 'Updated Name',
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      };
      const result = await controller.updateUser({ userId }, updateDto);
      expect(result).toEqual({ id: userId, ...updateDto });
      expect(usersService.updateUser).toHaveBeenCalledWith(userId, updateDto);
    });

    it('should throw HttpException on error', async () => {
      const userId = 'abc123';
      const updateDto: UpdateUserDto & UpdatePasswordDto = {
        email: 'new@email.com',
        name: 'Updated Name',
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      };
      jest.spyOn(usersService, 'updateUser').mockImplementation(() => {
        throw { message: 'Update failed', status: 400 };
      });

      await expect(
        controller.updateUser({ userId }, updateDto),
      ).rejects.toThrow('Update failed');
    });
  });
});
