import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  ForbiddenException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsEnum, IsMongoId } from 'class-validator';
import { InvoiceService } from './invoice.service';
import { InvoiceStatus } from './invoice.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ERRORS } from '../common/errors';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { UserPayload } from '../auth/jwt/jwt.strategy';
import { UserRole } from '../users/user.schema';
import { Roles } from '../common/decorators/roles.decorator';

class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus, {
    message: `status doit être une valeur valide : ${Object.values(InvoiceStatus).join(', ')}`,
  })
  status: InvoiceStatus;
}

class InvoiceParamDto {
  @IsMongoId({ message: 'id doit être un ObjectId valide' })
  id: string;
}

class CustomerParamDto {
  @IsMongoId({ message: 'customerId doit être un ObjectId valide' })
  customerId: string;
}

class TeamParamDto {
  @IsMongoId({ message: 'teamId doit être un ObjectId valide' })
  teamId: string;
}

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  // ⚠️ Routes statiques AVANT les routes dynamiques `:id`

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get()
  findAll() {
    return this.invoiceService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId')
  async findByTeam(
    @Param() params: TeamParamDto,
    @CurrentUser() user: UserPayload,
  ) {
    const isPrivileged =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

    if (!isPrivileged) {
      const isMember = await this.invoiceService.isUserTeamMember(
        params.teamId,
        user.userId,
      );
      if (!isMember) {
        throw new ForbiddenException(
          'Vous ne pouvez consulter que les factures de votre équipe',
        );
      }
    }

    return this.invoiceService.findByTeam(params.teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/:customerId')
  findByCustomer(
    @Param() params: CustomerParamDto,
    @CurrentUser() user: UserPayload,
  ) {
    const isPrivileged =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
    if (!isPrivileged && params.customerId !== user.userId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres factures',
      );
    }
    return this.invoiceService.findByCustomer(params.customerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param() params: InvoiceParamDto,
    @CurrentUser() user: UserPayload,
  ) {
    const invoice = await this.invoiceService.findOne(params.id);
    const isPrivileged =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
    if (!isPrivileged && invoice.userId !== user.userId) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_INVOICE_ACCESS);
    }
    return invoice;
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  async updateStatus(
    @Param() params: InvoiceParamDto,
    @Body() dto: UpdateInvoiceStatusDto,
    @CurrentUser() user: UserPayload,
  ) {
    const invoice = await this.invoiceService.findOne(params.id);
    const isPrivileged =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
    if (!isPrivileged && invoice.userId !== user.userId) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_INVOICE_UPDATE);
    }
    return this.invoiceService.updateStatus(params.id, dto.status);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param() params: InvoiceParamDto,
    @CurrentUser() user: UserPayload,
  ) {
    const isPrivileged =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
    if (!isPrivileged) {
      const invoice = await this.invoiceService.findOne(params.id);
      if (invoice.userId !== user.userId) {
        throw new ForbiddenException(ERRORS.FORBIDDEN_INVOICE_DELETE);
      }
    }
    return this.invoiceService.remove(params.id);
  }
}
