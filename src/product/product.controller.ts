import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, NotFoundException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Product } from './product.schema'; 
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { CreateDetailProductDto } from 'src/detail-product/dto/create-detail-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  // @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  // @UseGuards(JwtAuthGuard) // Ajouté pour sécuriser cette route
 @Patch(':id')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/image-products',
      filename: (req, file, callback) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        callback(null, uniqueName);
      },
    }),
  }),
)
async updateImage(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
  @Body() body: any,
): Promise<Product> {
  // Parse des champs reçus dans le formulaire
  const updateDto: UpdateProductDto = {
    detailData: body.detailData ? JSON.parse(body.detailData) : undefined,
    subcategoryId: body.subcategoryId || undefined,
    isActive:
      body.isActive !== undefined && body.isActive !== null
        ? body.isActive === 'true' || body.isActive === true
        : undefined,
    imageData: body.imageData ? JSON.parse(body.imageData) : undefined,
  };

  // Si un fichier est envoyé, on remplace l'image
  if (file) {
    const filePath = path.resolve('uploads', 'image-products', file.filename);

    updateDto.imageData = {
      filename: filePath,
      altText: body.altText || '',
    };
  }

  const updatedProduct = await this.productService.update(id, updateDto);

  if (!updatedProduct) {
    throw new NotFoundException(`Product with id ${id} not found`);
  }

  return updatedProduct;
}


  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/subcategory/:subcategoryId')
  updateSubcategory(
    @Param('id') id: string,
    @Param('subcategoryId') subcategoryId: string,
  ) {
    return this.productService.updateSubcategory(id, subcategoryId);
  }
}
