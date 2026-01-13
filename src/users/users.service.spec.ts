import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import { UserRepository } from './users.repository';
import { AwsS3Service } from '../aws/aws-s3.service';
import { MemberRepository } from '../members/member.repository';
import { User } from './user.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

describe('UsersService', () => {
  let service: UsersService;

  // Créez des mocks pour toutes les dépendances
  const mockUserRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockAwsS3Service = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  };

  const mockMemberRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: AwsS3Service,
          useValue: mockAwsS3Service,
        },
        {
          provide: MemberRepository,
          useValue: mockMemberRepository,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          _id: '123',
          email: 'test@example.com',
          firstName: 'Test',
          avatarFileKey: null,
          toObject: jest.fn().mockReturnThis(),
        },
      ];

      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.getUsers();

      expect(result).toBeDefined();
      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        filter: {},
        options: {
          projection: { _id: 1, email: 1, firstName: 1, avatarFileKey: 1 },
        },
      });
    });
  });

  /* ========================================================================== */
  /* 🧪 TESTS - GESTION DES ADRESSES                                           */
  /* ========================================================================== */

  describe('Address Management', () => {
    const mockUserId = new Types.ObjectId().toString();

    describe('addAddress', () => {
      const createAddressDto: CreateAddressDto = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        addressLine: '123 Main St',
        city: 'Paris',
        state: 'IDF',
        isDefault: false,
      };

      it('devrait ajouter la première adresse et la définir par défaut', async () => {
        const mockUser = {
          _id: mockUserId,
          addresses: [],
          save: jest.fn().mockResolvedValue({
            _id: mockUserId,
            addresses: [{ ...createAddressDto, isDefault: true }],
          }),
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await service.addAddress(mockUserId, createAddressDto);

        expect(mockUser.save).toHaveBeenCalled();
        expect(mockUser.addresses).toHaveLength(1);
        expect(mockUser.addresses[0].isDefault).toBe(true);
        expect(result).toBeDefined();
      });

      it('devrait réinitialiser les autres adresses si isDefault=true', async () => {
        const existingAddress = {
          _id: new Types.ObjectId(),
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+9876543210',
          addressLine: '456 Oak Ave',
          city: 'Lyon',
          isDefault: true,
        };

        const mockUser = {
          _id: mockUserId,
          addresses: [existingAddress],
          save: jest.fn().mockResolvedValue({
            _id: mockUserId,
            addresses: [
              { ...existingAddress, isDefault: false },
              { ...createAddressDto, isDefault: true },
            ],
          }),
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await service.addAddress(mockUserId, {
          ...createAddressDto,
          isDefault: true,
        });

        expect(mockUser.addresses[0].isDefault).toBe(false);
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('devrait lever une NotFoundException si utilisateur inexistant', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(
          service.addAddress(mockUserId, createAddressDto),
        ).rejects.toThrow(NotFoundException);
      });

      it("devrait initialiser le tableau addresses s'il est undefined", async () => {
        const mockUser = {
          _id: mockUserId,
          addresses: undefined,
          save: jest.fn().mockResolvedValue({
            _id: mockUserId,
            addresses: [createAddressDto],
          }),
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await service.addAddress(mockUserId, createAddressDto);

        expect(Array.isArray(mockUser.addresses)).toBe(true);
        expect(mockUser.save).toHaveBeenCalled();
      });
    });

    describe('getAddresses', () => {
      it('devrait retourner toutes les adresses triées', async () => {
        const addresses = [
          {
            _id: new Types.ObjectId(),
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            addressLine: '123 Main St',
            city: 'Paris',
            isDefault: false,
            createdAt: new Date('2024-01-01'),
          },
          {
            _id: new Types.ObjectId(),
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '+9876543210',
            addressLine: '456 Oak Ave',
            city: 'Lyon',
            isDefault: true,
            createdAt: new Date('2024-01-02'),
          },
        ];

        const mockUser = {
          _id: mockUserId,
          addresses,
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await service.getAddresses(mockUserId);

        expect(result).toHaveLength(2);
        expect(result[0].isDefault).toBe(true); // L'adresse par défaut doit être en premier
      });

      it('devrait retourner un tableau vide si aucune adresse', async () => {
        const mockUser = {
          _id: mockUserId,
          addresses: [],
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await service.getAddresses(mockUserId);

        expect(result).toEqual([]);
      });

      it('devrait retourner un tableau vide si addresses est undefined', async () => {
        const mockUser = {
          _id: mockUserId,
          addresses: undefined,
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await service.getAddresses(mockUserId);

        expect(result).toEqual([]);
      });

      it('devrait lever une NotFoundException si utilisateur inexistant', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(service.getAddresses(mockUserId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('getAddress', () => {
      it('devrait retourner une adresse spécifique', async () => {
        const addressId = new Types.ObjectId();
        const mockAddress = {
          _id: addressId,
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          addressLine: '123 Main St',
          city: 'Paris',
        };

        const mockUser = {
          _id: mockUserId,
          addresses: [mockAddress],
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await service.getAddress(
          mockUserId,
          addressId.toString(),
        );

        expect(result).toEqual(mockAddress);
      });

      it('devrait lever une NotFoundException si adresse inexistante', async () => {
        const mockUser = {
          _id: mockUserId,
          addresses: [],
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await expect(
          service.getAddress(mockUserId, new Types.ObjectId().toString()),
        ).rejects.toThrow(NotFoundException);
      });

      it('devrait lever une NotFoundException si utilisateur inexistant', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(
          service.getAddress(mockUserId, new Types.ObjectId().toString()),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateAddress', () => {
      const updateDto: UpdateAddressDto = {
        city: 'Marseille',
        isDefault: true,
      };

      it('devrait mettre à jour une adresse existante', async () => {
        const addressId = new Types.ObjectId();
        const mockAddress = {
          _id: addressId,
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          addressLine: '123 Main St',
          city: 'Paris',
          isDefault: false,
          createdAt: new Date(),
        };

        const mockUser = {
          _id: mockUserId,
          addresses: [mockAddress],
          save: jest.fn().mockResolvedValue({
            _id: mockUserId,
            addresses: [{ ...mockAddress, ...updateDto }],
          }),
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await service.updateAddress(
          mockUserId,
          addressId.toString(),
          updateDto,
        );

        expect(mockUser.addresses[0].city).toBe('Marseille');
        expect(mockUser.addresses[0].isDefault).toBe(true);
        expect(mockUser.save).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('devrait réinitialiser les autres adresses si isDefault devient true', async () => {
        const addressId1 = new Types.ObjectId();
        const addressId2 = new Types.ObjectId();

        const addresses = [
          {
            _id: addressId1,
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            addressLine: '123 Main St',
            city: 'Paris',
            isDefault: true,
            createdAt: new Date(),
          },
          {
            _id: addressId2,
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '+9876543210',
            addressLine: '456 Oak Ave',
            city: 'Lyon',
            isDefault: false,
            createdAt: new Date(),
          },
        ];

        const mockUser = {
          _id: mockUserId,
          addresses,
          save: jest.fn().mockResolvedValue({
            _id: mockUserId,
            addresses,
          }),
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await service.updateAddress(mockUserId, addressId2.toString(), {
          isDefault: true,
        });

        expect(mockUser.addresses[0].isDefault).toBe(false);
        expect(mockUser.addresses[1].isDefault).toBe(true);
      });

      it('devrait lever une NotFoundException si adresse inexistante', async () => {
        const mockUser = {
          _id: mockUserId,
          addresses: [],
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await expect(
          service.updateAddress(
            mockUserId,
            new Types.ObjectId().toString(),
            updateDto,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('devrait lever une NotFoundException si utilisateur inexistant', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(
          service.updateAddress(
            mockUserId,
            new Types.ObjectId().toString(),
            updateDto,
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('setDefaultAddress', () => {
      it('devrait définir une adresse comme par défaut', async () => {
        const addressId1 = new Types.ObjectId();
        const addressId2 = new Types.ObjectId();

        const addresses = [
          { _id: addressId1, city: 'Paris', isDefault: true },
          { _id: addressId2, city: 'Lyon', isDefault: false },
        ];

        const mockUser = {
          _id: mockUserId,
          addresses,
          save: jest.fn().mockResolvedValue({
            _id: mockUserId,
            addresses,
          }),
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await service.setDefaultAddress(mockUserId, addressId2.toString());

        expect(mockUser.addresses[0].isDefault).toBe(false);
        expect(mockUser.addresses[1].isDefault).toBe(true);
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('devrait lever une NotFoundException si adresse inexistante', async () => {
        const mockUser = {
          _id: mockUserId,
          addresses: [],
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await expect(
          service.setDefaultAddress(
            mockUserId,
            new Types.ObjectId().toString(),
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('devrait lever une NotFoundException si utilisateur inexistant', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(
          service.setDefaultAddress(
            mockUserId,
            new Types.ObjectId().toString(),
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteAddress', () => {
      it('devrait supprimer une adresse', async () => {
        const addressToDelete = new Types.ObjectId();
        const addresses = [
          { _id: addressToDelete, city: 'Paris', isDefault: false },
          { _id: new Types.ObjectId(), city: 'Lyon', isDefault: true },
        ];

        const mockUser = {
          _id: mockUserId,
          addresses: [...addresses],
          save: jest.fn().mockResolvedValue({
            _id: mockUserId,
            addresses: [addresses[1]],
          }),
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await service.deleteAddress(
          mockUserId,
          addressToDelete.toString(),
        );

        expect(mockUser.addresses).toHaveLength(1);
        expect(mockUser.save).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it("devrait définir la première adresse par défaut si on supprime l'adresse par défaut", async () => {
        const addressId1 = new Types.ObjectId();
        const addressId2 = new Types.ObjectId();

        const addresses = [
          { _id: addressId1, city: 'Paris', isDefault: true },
          { _id: addressId2, city: 'Lyon', isDefault: false },
        ];

        const mockUser = {
          _id: mockUserId,
          addresses: [...addresses],
          save: jest.fn().mockResolvedValue({
            _id: mockUserId,
            addresses: [{ ...addresses[1], isDefault: true }],
          }),
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await service.deleteAddress(mockUserId, addressId1.toString());

        expect(mockUser.addresses).toHaveLength(1);
        expect(mockUser.addresses[0].isDefault).toBe(true);
      });

      it('devrait lever une NotFoundException si adresse inexistante', async () => {
        const mockUser = {
          _id: mockUserId,
          addresses: [],
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        await expect(
          service.deleteAddress(mockUserId, new Types.ObjectId().toString()),
        ).rejects.toThrow(NotFoundException);
      });

      it('devrait lever une NotFoundException si utilisateur inexistant', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(
          service.deleteAddress(mockUserId, new Types.ObjectId().toString()),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
