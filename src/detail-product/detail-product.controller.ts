import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { DetailProductService } from './detail-product.service';
import { CreateDetailProductDto } from './dto/create-detail-product.dto';
import { UpdateDetailProductDto } from './dto/update-detail-product.dto';

@Controller('detail-products')
export class DetailProductController {
  constructor(private readonly service: DetailProductService) {}

  @Post()
  create(@Body() dto: CreateDetailProductDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDetailProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
