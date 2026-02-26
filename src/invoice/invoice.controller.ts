import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { InvoiceService } from './invoice.service';
import { InvoiceStatus } from './invoice.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus, {
    message: `status doit être une valeur valide: ${Object.values(InvoiceStatus).join(', ')}`,
  })
  status: InvoiceStatus;
}

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/:customerId')
  findByCustomer(@Param('customerId') customerId: string) {
    return this.invoiceService.findByCustomer(customerId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto) {
    return this.invoiceService.updateStatus(id, dto.status);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(id);
  }
}
