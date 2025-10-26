import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ERRORS } from '../common/errors';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from '../auth/dto/create-user.dto';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { UpdatePasswordDto } from '../auth/dto/update-password.dto';
import { AwsS3Service } from '../aws/aws-s3.service';
import { User } from './user.schema';
import { UserRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly awsS3Service: AwsS3Service,
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
          fileKey: fileKey
        });

        // Supprimer l'ancien avatar s'il existe
        if (user.avatarFileKey) {
          try {
            await this.awsS3Service.deleteFile({ 
              fileKey: user.avatarFileKey 
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
}