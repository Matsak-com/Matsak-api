import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ProductDecondService } from './product-decond.service';
import { ProductDecond } from './product-decond.schema';

@Controller('product-decond')
export class ProductDecondController {
  constructor(private readonly productDecondService: ProductDecondService) {}

  @Post()
  async create(@Body() data: Partial<ProductDecond>): Promise<ProductDecond> {
    return this.productDecondService.create(data);
  }

  @Get()
  async findAll(): Promise<ProductDecond[]> {
    return this.productDecondService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductDecond> {
    return this.productDecondService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<ProductDecond>,
  ): Promise<ProductDecond> {
    return this.productDecondService.update(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.productDecondService.remove(id);
  }
}
