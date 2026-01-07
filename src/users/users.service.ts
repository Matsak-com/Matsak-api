import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Types, Document, Model } from 'mongoose';
import { ERRORS } from '../common/errors';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from '../auth/dto/create-user.dto';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { UpdatePasswordDto } from '../auth/dto/update-password.dto';
import { AwsS3Service } from '../aws/aws-s3.service';
import { Address, User, UserDocument } from './user.schema';
import { UserRepository } from './users.repository';
import { MemberRepository } from '../members/member.repository';
import { Member, MemberStatus } from '../members/member.schema';
import { Team } from '../teams/team.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { InjectModel } from '@nestjs/mongoose';

// Type for User with populated current_team
interface UserWithPopulatedTeam extends Omit<User, 'current_team'> {
  current_team: (Team & Document) | null;
}

// Type for Member with populated team and role
interface PopulatedMember extends Omit<Member, 'team' | 'role'> {
  team: Team & Document;
  role: { _id: Types.ObjectId; name: string; level: number } & Document;
  createdAt?: Date;
}

// Return types for team-related methods
export interface CurrentTeamResponse {
  current_team: (Partial<Team> & { picture?: string }) | null;
}

export interface SwitchTeamResponse {
  message: string;
  current_team: string;
}

export interface UserTeamInfo {
  team: Team & Document;
  role: { _id: Types.ObjectId; name: string; level: number } & Document;
  status: MemberStatus;
  joinedAt?: Date;
}

// Type guard to check if current_team is populated (has properties beyond ObjectId)
function isTeamPopulated(currentTeam: unknown): currentTeam is Team & Document {
  return (
    currentTeam !== null &&
    currentTeam !== undefined &&
    typeof currentTeam === 'object' &&
    'email' in currentTeam
  );
}

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly awsS3Service: AwsS3Service,
    private readonly memberRepository: MemberRepository,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getUsers(): Promise<any[]> {
    const users = await this.userRepository.findAll({
      filter: {},
      options: {
        projection: { _id: 1, email: 1, firstName: 1, avatarFileKey: 1 },
      },
    });

    return Promise.all(
      users.map(async (user) => {
        const avatarUrl = user.avatarFileKey
          ? await this.awsS3Service.getFileUrl({ fileKey: user.avatarFileKey })
          : '';
        return { ...user.toObject(), avatarUrl };
      }),
    );
  }

  async getUser(id: string) {
    // Use aggregation pipeline for optimized memory usage and team projection
    const aggregationPipeline = [
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'members',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                status: { $ne: 'INACTIVE' },
              },
            },
            {
              $lookup: {
                from: 'roles',
                localField: 'role',
                foreignField: '_id',
                as: 'roleData',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      level: 1,
                    },
                  },
                ],
              },
            },
            {
              $project: {
                _id: 1,
                status: 1,
                joinedAt: '$createdAt',
                team: '$team',
                role: { $arrayElemAt: ['$roleData', 0] },
              },
            },
          ],
          as: 'memberships',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          firstname: 1,
          phone: 1,
          avatarFileKey: 1,
          createdAt: 1,
          updatedAt: 1,
          memberAt: '$memberships',
        },
      },
    ];

    const result = await this.userRepository.aggregate(aggregationPipeline);
    let avatarUrl = '';
    if (result[0]?.avatarFileKey) {
      try {
        avatarUrl = await this.awsS3Service.getFileUrl({
          fileKey: result[0].avatarFileKey,
        });
      } catch (error) {
        console.error(`Error fetching avatar URL: ${error.message}`);
      }
    }
    return { ...result[0], avatarUrl };
  }

  async findOne(query: Record<string, any>): Promise<User | null> {
    return this.userRepository.findOne({ filter: query });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ filter: { email } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new HttpException(
        ERRORS.USER_ALREADY_EXISTS,
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.userRepository.create({
      doc: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto & UpdatePasswordDto,
    avatarFile?: Express.Multer.File,
  ): Promise<{ message: string; user?: any }> {
    const user = await this.userRepository.findById({ id: userId });
    if (!user) {
      throw new NotFoundException(ERRORS.USER_NOT_FOUND);
    }

    // Mise à jour des informations de base
    if (updateUserDto.name || updateUserDto.firstname || updateUserDto.email) {
      user.name = updateUserDto.name ?? user.name;
      user.firstname = updateUserDto.firstname ?? user.firstname;
      user.email = updateUserDto.email ?? user.email;
    }

    // Mise à jour du mot de passe
    if (updateUserDto.currentPassword && updateUserDto.newPassword) {
      const isPasswordValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException(ERRORS.INVALID_CREDENTIALS);
      }

      user.password = await bcrypt.hash(updateUserDto.newPassword, 10);
    }

    // Mise à jour de l'avatar
    if (avatarFile) {
      try {
        // Valider le fichier
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (!allowedMimeTypes.includes(avatarFile.mimetype)) {
          throw new HttpException(
            'Type de fichier non autorisé. Formats acceptés: JPG, PNG, GIF, WEBP',
            HttpStatus.BAD_REQUEST,
          );
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (avatarFile.size > maxSize) {
          throw new HttpException(
            'Fichier trop volumineux. Taille maximale: 5MB',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Générer un fileKey unique pour le fichier
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = avatarFile.originalname.split('.').pop();
        const fileKey = `avatars/${userId}-${timestamp}-${randomString}.${extension}`;

        // Upload vers S3
        const uploadResult = await this.awsS3Service.uploadFile({
          file: avatarFile,
          fileKey: fileKey,
        });

        // Supprimer l'ancien avatar s'il existe
        if (user.avatarFileKey) {
          try {
            await this.awsS3Service.deleteFile({
              fileKey: user.avatarFileKey,
            });
          } catch (error) {
            console.error(`Error deleting old avatar: ${error.message}`);
          }
        }

        // Mettre à jour la clé de l'avatar
        user.avatarFileKey = uploadResult.fileKey || fileKey;
      } catch (error) {
        throw new HttpException(
          error.message || "Erreur lors de l'upload de l'avatar",
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    // Sauvegarder les modifications
    await user.save();

    // Récupérer l'URL de l'avatar pour la réponse
    let avatarUrl = '';
    if (user.avatarFileKey) {
      try {
        avatarUrl = await this.awsS3Service.getFileUrl({
          fileKey: user.avatarFileKey,
        });
      } catch (error) {
        console.error(`Error fetching avatar URL: ${error.message}`);
      }
    }

    const userObj = user.toObject();
    delete userObj.password;

    return {
      message: 'Profil mis à jour avec succès',
      user: { ...userObj, avatarUrl },
    };
  }

  async update(
    query: Record<string, any>,
    updateUserDto: Partial<CreateUserDto>,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ filter: query });
    if (!user) {
      throw new NotFoundException(ERRORS.USER_NOT_FOUND);
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return user.save();
  }

  async delete(id: string): Promise<void> {
    const user = await this.findOne({ _id: id });
    if (!user) {
      throw new NotFoundException(ERRORS.USER_NOT_FOUND);
    }

    // Supprimer l'avatar de S3 s'il existe
    if (user.avatarFileKey) {
      try {
        await this.awsS3Service.deleteFile({ fileKey: user.avatarFileKey });
      } catch (error) {
        console.error(
          `Error deleting avatar during user deletion: ${error.message}`,
        );
      }
    }

    await this.userRepository.delete({ id });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    const userObj: any = user.toObject();
    delete userObj.password;
    return userObj;
  }

  /**
   * Switch user's current team
   * Validates that the user is a member of the team before switching
   */
  async switchCurrentTeam(
    userId: string,
    teamId: string,
  ): Promise<SwitchTeamResponse> {
    const user = await this.userRepository.findById({ id: userId });
    if (!user) {
      throw new NotFoundException(ERRORS.USER_NOT_FOUND);
    }

    // Validate that the user is an active member of the team
    const membership = await this.memberRepository.findOne({
      filter: {
        user: new Types.ObjectId(userId),
        team: new Types.ObjectId(teamId),
        status: MemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new BadRequestException(
        'You are not an active member of this team',
      );
    }

    // Update current_team
    user.current_team = new Types.ObjectId(teamId);
    await user.save();

    return {
      message: 'Current team switched successfully',
      current_team: teamId,
    };
  }

  /**
   * Get user's current team information
   */
  async getCurrentTeam(userId: string): Promise<CurrentTeamResponse> {
    const user = await this.userRepository.findById({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException(ERRORS.USER_NOT_FOUND);
    }

    // If no current_team is set, return null
    if (!user.current_team) {
      return {
        current_team: null,
      };
    }

    // Fetch the populated user with current_team
    const populatedUser = (await this.userRepository.findById({
      id: userId,
      options: {
        populate: [{ path: 'current_team' }],
      },
    })) as unknown as UserWithPopulatedTeam | null;

    if (!populatedUser) {
      throw new NotFoundException(ERRORS.USER_NOT_FOUND);
    }

    // Handle populated team with type safety
    let teamWithUrl: (Partial<Team> & { picture?: string }) | null =
      populatedUser.current_team;

    if (
      isTeamPopulated(populatedUser.current_team) &&
      populatedUser.current_team.picture
    ) {
      const pictureUrl = await this.awsS3Service.getFileUrl({
        fileKey: populatedUser.current_team.picture,
      });

      // Create a new object with the picture URL instead of mutating
      teamWithUrl = {
        ...populatedUser.current_team.toObject(),
        picture: pictureUrl,
      };
    }

    return {
      current_team: teamWithUrl || null,
    };
  }

  /**
   * Get all teams that a user is a member of
   */
  async getUserTeams(userId: string): Promise<UserTeamInfo[]> {
    const memberships = (await this.memberRepository.findAll({
      filter: {
        user: new Types.ObjectId(userId),
        status: MemberStatus.ACTIVE,
      },
      options: {
        populate: [{ path: 'team' }, { path: 'role', select: 'name level' }],
      },
    })) as unknown as PopulatedMember[];

    return await Promise.all(
      memberships.map(async (membership): Promise<UserTeamInfo> => {
        if (membership.team && membership.team.picture) {
          membership.team.picture = await this.awsS3Service.getFileUrl({
            fileKey: membership.team.picture,
          });
        }

        return {
          team: membership.team,
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt || membership.createdAt,
        };
      }),
    );
  }

  /* ========================================================================== */
  /* 🏠 GESTION DES ADRESSES - VERSION CORRIGÉE                                */
  /* ========================================================================== */

  /**
   * Ajouter une nouvelle adresse
   */
  async addAddress(
    userId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<User> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // ✅ Initialiser le tableau si undefined ou null
      if (!user.addresses) {
        user.addresses = [];
      }

      // Si c'est la première adresse OU si isDefault est true
      if (user.addresses.length === 0) {
        createAddressDto.isDefault = true;
      } else if (createAddressDto.isDefault) {
        // Réinitialiser toutes les autres adresses à false
        user.addresses.forEach((addr) => {
          addr.isDefault = false;
        });
      }

      const newAddress = {
        ...createAddressDto,
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Address;

      user.addresses.push(newAddress);
      const savedUser = await user.save();
      return savedUser;
    } catch (error) {
      console.error('❌ Erreur addAddress:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les adresses d'un utilisateur
   */
  async getAddresses(userId: string): Promise<Address[]> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // ✅ Initialiser si undefined ou null
      if (!user.addresses) {
        user.addresses = [];
        await user.save();
        return [];
      }

      // ✅ Vérifier si c'est un tableau
      if (!Array.isArray(user.addresses)) {
        console.error(
          "❌ addresses n'est pas un tableau:",
          typeof user.addresses,
        );
        return [];
      }

      // Trier : adresse par défaut en premier, puis par date de création
      return user.addresses.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('❌ Erreur getAddresses:', error);
      throw error;
    }
  }

  /**
   * Récupérer une adresse spécifique
   */
  async getAddress(userId: string, addressId: string): Promise<Address> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (!user.addresses || !Array.isArray(user.addresses)) {
        throw new NotFoundException('Aucune adresse trouvée');
      }

      const address = user.addresses.find(
        (addr) => addr._id?.toString() === addressId,
      );

      if (!address) {
        throw new NotFoundException('Adresse non trouvée');
      }
      return address;
    } catch (error) {
      console.error('❌ Erreur getAddress:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une adresse
   */
  async updateAddress(
    userId: string,
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<User> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (!user.addresses || !Array.isArray(user.addresses)) {
        throw new NotFoundException('Aucune adresse trouvée');
      }

      const addressIndex = user.addresses.findIndex(
        (addr) => addr._id?.toString() === addressId,
      );

      if (addressIndex === -1) {
        throw new NotFoundException('Adresse non trouvée');
      }

      const currentAddress = user.addresses[addressIndex];

      // Si on change l'adresse en défaut
      if (updateAddressDto.isDefault && !currentAddress.isDefault) {
        user.addresses.forEach((addr) => {
          if (addr._id?.toString() !== addressId) {
            addr.isDefault = false;
          }
        });
      }

      // Mettre à jour l'adresse
      user.addresses[addressIndex] = {
        ...currentAddress,
        ...updateAddressDto,
        _id: currentAddress._id,
        createdAt: currentAddress.createdAt,
        updatedAt: new Date(),
      };

      const savedUser = await user.save();
      return savedUser;
    } catch (error) {
      console.error('❌ Erreur updateAddress:', error);
      throw error;
    }
  }

  /**
   * Définir une adresse comme par défaut
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<User> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (!user.addresses || !Array.isArray(user.addresses)) {
        throw new NotFoundException('Aucune adresse trouvée');
      }

      const addressExists = user.addresses.some(
        (addr) => addr._id?.toString() === addressId,
      );

      if (!addressExists) {
        throw new NotFoundException('Adresse non trouvée');
      }

      // ✅ Réinitialiser TOUTES les adresses à false, sauf celle sélectionnée
      user.addresses.forEach((addr) => {
        addr.isDefault = addr._id?.toString() === addressId;
      });

      const savedUser = await user.save();
      return savedUser;
    } catch (error) {
      console.error('❌ Erreur setDefaultAddress:', error);
      throw error;
    }
  }

  /**
   * Supprimer une adresse
   */
  async deleteAddress(userId: string, addressId: string): Promise<User> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (!user.addresses || !Array.isArray(user.addresses)) {
        throw new NotFoundException('Aucune adresse trouvée');
      }

      const addressIndex = user.addresses.findIndex(
        (addr) => addr._id?.toString() === addressId,
      );

      if (addressIndex === -1) {
        throw new NotFoundException('Adresse non trouvée');
      }

      const deletedAddress = user.addresses[addressIndex];
      user.addresses.splice(addressIndex, 1);

      // ✅ Si l'adresse supprimée était par défaut et qu'il reste des adresses
      if (deletedAddress.isDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
      }

      const savedUser = await user.save();
      return savedUser;
    } catch (error) {
      console.error('❌ Erreur deleteAddress:', error);
      throw error;
    }
  }
}
