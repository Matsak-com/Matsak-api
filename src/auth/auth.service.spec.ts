import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from '../notifications/notification.service';
import { UserRole } from 'src/users/user.schema';

// Mock des services
const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  validateUser: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockNotificationService = {
  sendEmail: jest.fn(),
  sendSms: jest.fn(),
  scheduleEmail: jest.fn(),
  scheduleSms: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(usersService).toBeDefined();
    expect(jwtService).toBeDefined();
    expect(notificationService).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Données d'entrée
      const createUserDto = {
        name: 'Doe',
        firstname: 'John',
        email: 'john.doe@example.com',
        password: 'Password123',
        role: UserRole.USER,
      };

      // Mock des réponses
      const mockUser = {
        _id: 'user123',
        name: 'Doe',
        firstname: 'John',
        email: 'john.doe@example.com',
        role: 'user',
        _idToString: () => 'user123',
      };

      const mockFullUser = {
        ...mockUser,
        current_team: null,
      };

      // Configuration des mocks
      mockUsersService.findByEmail.mockResolvedValue(null); // Aucun utilisateur existant
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.findOne.mockResolvedValue(mockFullUser);
      mockJwtService.signAsync.mockResolvedValue('fake-jwt-token');
      mockNotificationService.sendEmail.mockResolvedValue(true);

      // Exécution
      const result = await service.register(createUserDto);

      // Assertions
      expect(usersService.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(usersService.findOne).toHaveBeenCalledWith({ _id: 'user123' });
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(notificationService.sendEmail).toHaveBeenCalled();
      
      expect(result).toEqual({
        accessToken: 'fake-jwt-token',
        user: 'user123',
        role: 'user',
        current_team: null,
        message: 'User registered successfully',
      });
    });

    it('should throw conflict exception if user already exists', async () => {
      const createUserDto = {
        name: 'Doe',
        firstname: 'John',
        email: 'john.doe@example.com',
        password: 'password123',
        role: UserRole.USER,
      };

      // Mock d'un utilisateur existant
      const existingUser = {
        _id: 'existing123',
        email: 'john.doe@example.com',
      };

      mockUsersService.findByEmail.mockResolvedValue(existingUser);

      // Expectation
      await expect(service.register(createUserDto)).rejects.toThrow();

      // Vérifications
      expect(usersService.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(usersService.create).not.toHaveBeenCalled();
      expect(notificationService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully', async () => {
      const createUserDto = {
        name: 'Doe',
        firstname: 'John',
        email: 'john.doe@example.com',
        password: 'password123',
        role: UserRole.USER,
      };

      const mockUser = {
        _id: 'user123',
        name: 'Doe',
        firstname: 'John',
        email: 'john.doe@example.com',
        role: 'user',
        _idToString: () => 'user123',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.findOne.mockResolvedValue({ ...mockUser, current_team: null });
      mockJwtService.signAsync.mockResolvedValue('fake-jwt-token');
      
      // Simuler un échec d'envoi d'email
      mockNotificationService.sendEmail.mockRejectedValue(new Error('Email failed'));

      // L'inscription devrait quand même réussir (l'email est secondaire)
      const result = await service.register(createUserDto);

      expect(result).toEqual({
        accessToken: 'fake-jwt-token',
        user: 'user123',
        role: 'user',
        current_team: null,
        message: 'User registered successfully',
      });
      
      expect(notificationService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'john.doe@example.com',
        password: 'password123',
      };

      const mockUser = {
        _id: 'user123',
        email: 'john.doe@example.com',
        role: 'user',
      };

      const mockFullUser = {
        ...mockUser,
        current_team: null,
      };

      mockUsersService.validateUser.mockResolvedValue(mockUser);
      mockUsersService.findOne.mockResolvedValue(mockFullUser);
      mockJwtService.signAsync.mockResolvedValue('fake-jwt-token');

      const result = await service.login({ loginDto });

      expect(usersService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password
      );
      expect(usersService.findOne).toHaveBeenCalledWith({ _id: 'user123' });
      expect(jwtService.signAsync).toHaveBeenCalled();
      
      expect(result).toEqual({
        accessToken: 'fake-jwt-token',
        user: 'user123',
        role: 'user',
        current_team: null,
      });
    });

    it('should throw unauthorized for invalid credentials', async () => {
      const loginDto = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      };

      mockUsersService.validateUser.mockResolvedValue(null);

      await expect(service.login({ loginDto })).rejects.toThrow();
      expect(usersService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password
      );
    });
  });

  describe('resetUserPasswordRequest', () => {
    it('should initiate password reset for existing user', async () => {
      const email = 'john.doe@example.com';
      const existingUser = {
        id: 'user123',
        email: 'john.doe@example.com',
        firstName: 'John',
        isResettingPassword: false,
      };

      mockUsersService.findByEmail.mockResolvedValue(existingUser);
      mockUsersService.update.mockResolvedValue({});

      const result = await service.resetUserPasswordRequest({ email });

      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      expect(usersService.update).toHaveBeenCalledWith(
        existingUser.id,
        expect.objectContaining({
          isResettingPassword: true,
          resetPasswordToken: expect.any(String),
        })
      );
      expect(result).toEqual({
        error: false,
        message: 'Please check your email to reset your password.',
      });
    });

    it('should throw error if user not found', async () => {
      const email = 'nonexistent@example.com';

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.resetUserPasswordRequest({ email })).rejects.toThrow();
      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
    });
  });
});