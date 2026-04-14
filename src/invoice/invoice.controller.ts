import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  ForbiddenException,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsEnum, IsMongoId } from 'class-validator';
import { InvoiceService } from './invoice.service';
import { InvoiceStatus } from './invoice.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ERRORS } from '../common/errors';

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
  @Get()
  findAll(@Request() req: any) {
    const isAdmin =
      req.user?.role === 'admin' ||
      req.user?.roles?.includes('admin') ||
      req.user?.role === 'superadmin' ||
      req.user?.roles?.includes('superadmin');

    if (!isAdmin) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_ALL_INVOICES);
    }
    return this.invoiceService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId')
  findByTeam(@Param() params: TeamParamDto, @Request() req: any) {
    const isAdmin =
      req.user?.role === 'admin' ||
      req.user?.roles?.includes('admin') ||
      req.user?.role === 'superadmin' ||
      req.user?.roles?.includes('superadmin');

    if (!isAdmin) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_TEAM_INVOICES);
    }
    return this.invoiceService.findByTeam(params.teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/:customerId')
  findByCustomer(@Param() params: CustomerParamDto, @Request() req: any) {
    if (params.customerId !== req.user?.userId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres factures',
      );
    }
    return this.invoiceService.findByCustomer(params.customerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param() params: InvoiceParamDto, @Request() req: any) {
    const invoice = await this.invoiceService.findOne(params.id);
    if (
      invoice.userId !== req.user?.userId &&
      !(
        req.user?.role === 'admin' ||
        req.user?.roles?.includes('admin') ||
        req.user?.role === 'superadmin' ||
        req.user?.roles?.includes('superadmin')
      )
    ) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_INVOICE_ACCESS);
    }
    return invoice;
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  async updateStatus(
    @Param() params: InvoiceParamDto,
    @Body() dto: UpdateInvoiceStatusDto,
    @Request() req: any,
  ) {
    const invoice = await this.invoiceService.findOne(params.id);
    if (
      invoice.userId !== req.user?.userId &&
      !(
        req.user?.role === 'admin' ||
        req.user?.roles?.includes('admin') ||
        req.user?.role === 'superadmin' ||
        req.user?.roles?.includes('superadmin')
      )
    ) {
      throw new ForbiddenException(ERRORS.FORBIDDEN_INVOICE_UPDATE);
    }
    return this.invoiceService.updateStatus(params.id, dto.status);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param() params: InvoiceParamDto, @Request() req: any) {
    const isAdmin =
      req.user?.role === 'admin' ||
      req.user?.roles?.includes('admin') ||
      req.user?.role === 'superadmin' ||
      req.user?.roles?.includes('superadmin');

    if (!isAdmin) {
      const invoice = await this.invoiceService.findOne(params.id);
      if (invoice.userId !== req.user?.userId) {
        throw new ForbiddenException(ERRORS.FORBIDDEN_INVOICE_DELETE);
      }
    }

    return this.invoiceService.remove(params.id);
  }
}
