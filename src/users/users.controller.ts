import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  UnauthorizedException,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { UpdatePasswordDto } from '../auth/dto/update-password.dto';
import { SwitchTeamDto } from '../auth/dto/switch-team.dto';
import { UsersService, SwitchTeamResponse } from './users.service';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { UserPayload } from '../auth/jwt/jwt.strategy';
import { UserRole } from '../users/user.schema';
import {
  userIdParamSchema,
  updateUserSchema,
  updatePasswordSchema,
  switchTeamSchema,
} from '../common/schemas/auth.schemas';
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from '../common/schemas/address.schemas';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ERRORS } from '../common/errors';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('/current-team')
  async getCurrentTeam(@CurrentUser() user: UserPayload) {
    return this.usersService.getCurrentTeam(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/teams')
  async getUserTeams(@CurrentUser() user: UserPayload) {
    return this.usersService.getUserTeams(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/current-team')
  @CompoundZodValidation({
    body: switchTeamSchema,
  })
  async switchCurrentTeam(
    @CurrentUser() user: UserPayload,
    @Body() switchTeamDto: SwitchTeamDto,
  ): Promise<SwitchTeamResponse> {
    try {
      return await this.usersService.switchCurrentTeam(
        user.userId,
        switchTeamDto.teamId,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        ERRORS.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:userId')
  @CompoundZodValidation({ params: userIdParamSchema })
  getUser(
    @Param() params: { userId: string },
    @CurrentUser() user: UserPayload,
  ) {
    // Users can only access their own data unless they're admin
    if (user.userId !== params.userId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_USER_ACCESS);
    }
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
    @CurrentUser() user: UserPayload,
    @Body() updateUserDto: UpdateUserDto & UpdatePasswordDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Users can only update their own data unless they're admin
    if (user.userId !== params.userId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_USER_UPDATE);
    }

    try {
      return await this.usersService.updateUser(
        params.userId,
        updateUserDto,
        file,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        ERRORS.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ========== ROUTES POUR LES ADRESSES (AVEC VALIDATION) ==========

  /**
   * Ajouter une nouvelle adresse
   * POST /users/me/addresses
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/addresses')
  @CompoundZodValidation({ body: createAddressSchema })
  async addAddress(
    @CurrentUser() user: UserPayload,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    try {
      const updatedUser = await this.usersService.addAddress(
        user.userId,
        createAddressDto,
      );
      return {
        message: 'Address added successfully',
        addresses: updatedUser.addresses,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        ERRORS.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Récupérer toutes les adresses
   * GET /users/me/addresses
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/addresses')
  async getAddresses(@CurrentUser() user: UserPayload) {
    try {
      return await this.usersService.getAddresses(user.userId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        ERRORS.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Récupérer une adresse spécifique
   * GET /users/me/addresses/:addressId
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/addresses/:addressId')
  @CompoundZodValidation({ params: addressIdParamSchema })
  async getAddress(
    @CurrentUser() user: UserPayload,
    @Param('addressId') addressId: string,
  ) {
    try {
      return await this.usersService.getAddress(user.userId, addressId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(ERRORS.ADDRESS_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Mettre à jour une adresse
   * PATCH /users/me/addresses/:addressId
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/addresses/:addressId')
  @CompoundZodValidation({
    params: addressIdParamSchema,
    body: updateAddressSchema,
  })
  async updateAddress(
    @CurrentUser() user: UserPayload,
    @Param() params: { addressId: string }, // ← objet validé par Zod
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    // Vérifie qu'on a bien les infos nécessaires
    if (!user || !user.userId) {
      throw new UnauthorizedException(ERRORS.USER_PAYLOAD_MISSING);
    }

    try {
      const updatedUser = await this.usersService.updateAddress(
        user.userId,
        params.addressId, // ← passe juste la string
        updateAddressDto,
      );

      return {
        message: 'Address successfully updated',
        addresses: updatedUser.addresses,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        ERRORS.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Définir une adresse comme par défaut
   * PATCH /users/me/addresses/:addressId/set-default
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/addresses/:addressId/set-default')
  @CompoundZodValidation({ params: addressIdParamSchema })
  async setDefaultAddress(
    @CurrentUser() user: UserPayload,
    @Param() params: { addressId: string },
  ) {
    try {
      const updatedUser = await this.usersService.setDefaultAddress(
        user.userId,
        params.addressId,
      );
      return {
        message: 'Address defaut define',
        addresses: updatedUser.addresses,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        ERRORS.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Supprimer une adresse
   * DELETE /users/me/addresses/:addressId
   */
  @UseGuards(JwtAuthGuard)
  @Delete('me/addresses/:addressId')
  @CompoundZodValidation({ params: addressIdParamSchema })
  async deleteAddress(
    @CurrentUser() user: UserPayload,
    @Param() params: { addressId: string },
  ) {
    try {
      const updatedUser = await this.usersService.deleteAddress(
        user.userId,
        params.addressId,
      );
      return {
        message: 'address success deleted',
        addresses: updatedUser.addresses,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        ERRORS.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
