import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  Patch,
  Post,
  ForbiddenException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { InvoiceService } from './invoice.service';
import { InvoiceStatus } from './invoice.schema';
import { DeliveryCheckService } from './delivery-check.service';
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

// ── Delivery verification DTOs ────────────────────────────────────────────────

class DeliveryTokenParamDto {
  /** The signed JWT embedded in the QR code URL. */
  @IsString()
  @MaxLength(2000)
  token: string;
}

class DeliveryItemParamDto {
  @IsString()
  @MaxLength(2000)
  token: string;

  @IsMongoId({ message: 'productId doit être un ObjectId valide' })
  productId: string;
}

class CheckDeliveryBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  checkerName?: string;
}

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly deliveryCheckService: DeliveryCheckService,
  ) {}

  // ⚠️ Routes statiques AVANT les routes dynamiques `:id`

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get()
  findAll() {
    return this.invoiceService.findAll();
  }

  // ── Delivery verification (public — token IS the credential) ───────────────

  /**
   * GET /invoices/delivery/:token
   *
   * Validates the signed QR token and returns the delivery checklist.
   * Public endpoint — rate-limited to prevent enumeration attacks.
   * The JWT token itself is the authentication credential.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60 } })
  @Get('delivery/:token')
  getDeliveryCheck(@Param() params: DeliveryTokenParamDto) {
    return this.deliveryCheckService.getDeliveryCheck(params.token);
  }

  /**
   * PATCH /invoices/delivery/:token/items/:productId
   *
   * Marks one item as checked.  Accepts an optional `checkerName` in the body
   * (the delivery person's name or employee ID — no account needed).
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 120, ttl: 60 } })
  @Patch('delivery/:token/items/:productId')
  checkItem(
    @Param() params: DeliveryItemParamDto,
    @Body() body: CheckDeliveryBodyDto,
  ) {
    return this.deliveryCheckService.checkItem(
      params.token,
      params.productId,
      body.checkerName,
    );
  }

  /**
   * POST /invoices/delivery/:token/complete
   *
   * Closes the delivery — marks all remaining items as checked and sets
   * `completedAt`.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @Post('delivery/:token/complete')
  completeDelivery(
    @Param() params: DeliveryTokenParamDto,
    @Body() body: CheckDeliveryBodyDto,
  ) {
    return this.deliveryCheckService.completeDelivery(
      params.token,
      body.checkerName,
    );
  }

  /**
   * POST /invoices/delivery/:token/revoke  (admin only)
   *
   * Hard-revokes a QR token immediately.
   */
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post('delivery/:token/revoke')
  revokeDeliveryToken(@Param() params: DeliveryTokenParamDto) {
    return this.deliveryCheckService.revokeToken(params.token);
  }

  // ── Team & customer routes ─────────────────────────────────────────────────

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
