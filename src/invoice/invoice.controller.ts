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
  @Get('team/:teamId')
  findByTeam(@Param() params: TeamParamDto) {
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
    if (invoice.userId !== req.user?.userId) {
      throw new ForbiddenException('Accès non autorisé à cette facture');
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
    if (invoice.userId !== req.user?.userId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier cette facture');
    }
    return this.invoiceService.updateStatus(params.id, dto.status);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param() params: InvoiceParamDto, @Request() req: any) {
    const isAdmin =
      req.user?.role === 'admin' || req.user?.roles?.includes('admin');

    if (!isAdmin) {
      const invoice = await this.invoiceService.findOne(params.id);
      if (invoice.userId !== req.user?.userId) {
        throw new ForbiddenException(
          'Vous ne pouvez pas supprimer cette facture',
        );
      }
    }

    return this.invoiceService.remove(params.id);
  }
}
