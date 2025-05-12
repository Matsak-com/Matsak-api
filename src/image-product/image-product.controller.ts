import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ImageProductService } from './image-product.service';
import { ImageProduct } from './image-product.schema';

@Controller('image-product')
export class ImageProductController {
  constructor(private readonly imageProductService: ImageProductService) {}

  
  @Post()
  async create(@Body() createImageDto: any): Promise<ImageProduct> {
    return this.imageProductService.create(createImageDto);
  }

  
  @Get()
  async findAll(): Promise<ImageProduct[]> {
    return this.imageProductService.findAll();
  }

  
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ImageProduct> {
    return this.imageProductService.findOne(id);
  }

  
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateImageDto: any,
  ): Promise<ImageProduct> {
    return this.imageProductService.update(id, updateImageDto);
  }

  
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    return this.imageProductService.remove(id);
  }
}
