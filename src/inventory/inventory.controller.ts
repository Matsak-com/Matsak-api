import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  StockInDto,
  StockOutDto,
  StockAdjustmentDto,
  QueryInventoryDto,
  BulkUpdateDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('stock-in')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async stockIn(@Body() stockInDto: StockInDto, @Req() req: any) {
    const userId = req.user?.userId;
    return this.inventoryService.stockIn(stockInDto, userId);
  }

  @Post('stock-out')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async stockOut(@Body() stockOutDto: StockOutDto, @Req() req: any) {
    const userId = req.user?.userId;
    return this.inventoryService.stockOut(stockOutDto, userId);
  }

  @Post('adjust')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async adjustStock(
    @Body() adjustmentDto: StockAdjustmentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.inventoryService.adjustStock(adjustmentDto, userId);
  }

  @Get('product/:productId')
  async getProductStock(@Param('productId') productId: string) {
    return this.inventoryService.getProductStock(productId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactionHistory(@Query() query: QueryInventoryDto) {
    return this.inventoryService.getTransactionHistory(query);
  }

  @Get('low-stock')
  @UseGuards(JwtAuthGuard)
  async getLowStockProducts(@Query('teamId') teamId?: string) {
    return this.inventoryService.getLowStockProducts(teamId);
  }

  @Post('bulk-update')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStock(@Body() bulkUpdateDto: BulkUpdateDto) {
    return this.inventoryService.bulkUpdateStock(bulkUpdateDto);
  }
}
