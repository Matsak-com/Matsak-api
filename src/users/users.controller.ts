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
  Request,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from 'src/auth/dto/update-user.dto';
import { UpdatePasswordDto } from 'src/auth/dto/update-password.dto';
import { SwitchTeamDto } from 'src/auth/dto/switch-team.dto';
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
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

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
      throw new HttpException(
        error.message || 'Error switching team',
        error.status || HttpStatus.BAD_REQUEST,
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
      throw new ForbiddenException(
        'You can only access your own user information',
      );
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
      throw new ForbiddenException('You can only update your own information');
    }

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

  // ========== ROUTES POUR LES ADRESSES ==========

  /**
   * Ajouter une nouvelle adresse
   * POST /users/me/addresses
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/addresses')
  async addAddress(@Request() req, @Body() createAddressDto: CreateAddressDto) {
    const user = await this.usersService.addAddress(
      req.user.userId,
      createAddressDto,
    );
    return {
      message: 'Adresse ajoutée avec succès',
      addresses: user.addresses,
    };
  }

  /**
   * Récupérer toutes les adresses
   * GET /users/me/addresses
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/addresses')
  async getAddresses(@Request() req) {
    return this.usersService.getAddresses(req.user.userId);
  }

  /**
   * Récupérer une adresse spécifique
   * GET /users/me/addresses/:addressId
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/addresses/:addressId')
  async getAddress(@Request() req, @Param('addressId') addressId: string) {
    return this.usersService.getAddress(req.user.userId, addressId);
  }

  /**
   * Mettre à jour une adresse
   * PATCH /users/me/addresses/:addressId
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/addresses/:addressId')
  async updateAddress(
    @Request() req,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const user = await this.usersService.updateAddress(
      req.user.userId,
      addressId,
      updateAddressDto,
    );
    return {
      message: 'Adresse mise à jour avec succès',
      addresses: user.addresses,
    };
  }

  /**
   * Définir une adresse comme par défaut
   * PATCH /users/me/addresses/:addressId/set-default
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/addresses/:addressId/set-default')
  async setDefaultAddress(
    @Request() req,
    @Param('addressId') addressId: string,
  ) {
    const user = await this.usersService.setDefaultAddress(
      req.user.userId,
      addressId,
    );
    return {
      message: 'Adresse définie par défaut',
      addresses: user.addresses,
    };
  }

  /**
   * Supprimer une adresse
   * DELETE /users/me/addresses/:addressId
   */
  @UseGuards(JwtAuthGuard)
  @Delete('me/addresses/:addressId')
  async deleteAddress(@Request() req, @Param('addressId') addressId: string) {
    const user = await this.usersService.deleteAddress(
      req.user.userId,
      addressId,
    );
    return {
      message: 'Adresse supprimée avec succès',
      addresses: user.addresses,
    };
  }
}
