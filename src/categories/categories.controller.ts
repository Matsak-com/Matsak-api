import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './category.schema';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import { ZodMultipart } from '../common/decorators/zod-multipart.decorator';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from '../common/schemas/category.schemas';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ZodMultipart(createCategorySchema, 'imageUrl')
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    imageUrl: Express.Multer.File,
  ): Promise<Category> {
    return this.categoriesService.create({ ...createCategoryDto, imageUrl });
  }

  @Get()
  async findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get('with-subcategories')
  async getCategoriesWithSubCategories(): Promise<any[]> {
    return this.categoriesService.getCategoriesWithSubCategories();
  }

  @Get('tree')
  async getCategoriesTree(): Promise<any[]> {
    return this.categoriesService.getCategoriesTree();
  }

  @Get(':id')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  async findOne(@Param() params: { id: string }): Promise<Category> {
    return this.categoriesService.findOne(params.id);
  }

  @Get(':id/tree')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  async getCategoryTree(@Param() params: { id: string }): Promise<any> {
    return this.categoriesService.getCategoryTree(params.id);
  }

  @Patch(':id')
  @ZodMultipart(updateCategorySchema, 'imageUrl')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  async update(
    @Param() params: { id: string },
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/*' }),
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    imageUrl: Express.Multer.File,
  ): Promise<Category> {
    return this.categoriesService.update(params.id, {
      ...updateCategoryDto,
      imageUrl,
    });
  }

  @Delete(':id')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  async remove(
    @Param() params: { id: string },
  ): Promise<{ deleted: boolean; subcategoriesDeleted: number }> {
    return this.categoriesService.remove(params.id);
  }
}
