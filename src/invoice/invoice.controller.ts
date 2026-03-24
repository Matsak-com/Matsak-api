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

// ValidationPipe activé au niveau controller pour valider DTOs et params.
// Si vous avez déjà un ValidationPipe global dans main.ts, ce decorator
// est redondant mais inoffensif — vous pouvez le retirer.
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param() params: InvoiceParamDto, @Request() req: any) {
    const invoice = await this.invoiceService.findOne(params.id);

    // Ownership : seul le propriétaire de la facture peut la consulter
    if (invoice.userId !== req.user?.userId) {
      throw new ForbiddenException('Accès non autorisé à cette facture');
    }

    return invoice;
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/:customerId')
  findByCustomer(
    @Param() params: CustomerParamDto,
    @Request() req: any,
  ) {
    // Un utilisateur ne peut consulter que ses propres factures
    if (params.customerId !== req.user?.userId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres factures',
      );
    }

    return this.invoiceService.findByCustomer(params.customerId);
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

    // dto.status est typé InvoiceStatus — pas de cast `as any` nécessaire
    return this.invoiceService.updateStatus(params.id, dto.status);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param() params: InvoiceParamDto, @Request() req: any) {
    const invoice = await this.invoiceService.findOne(params.id);

    if (invoice.userId !== req.user?.userId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer cette facture');
    }

    return this.invoiceService.remove(params.id);
  }
}
