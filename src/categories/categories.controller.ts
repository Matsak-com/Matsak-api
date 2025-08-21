import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './category.schema';
import {
  ZodValidation,
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from '../common/schemas/category.schemas';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ZodValidation(createCategorySchema)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  async findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get('with-subcategories')
  async getCategoriesWithSubCategories(): Promise<any[]> {
    return this.categoriesService.getCategoriesWithSubCategories();
  }

  @Get(':id')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  async findOne(@Param() params: { id: string }): Promise<Category> {
    return this.categoriesService.findOne(params.id);
  }

  @Patch(':id')
  @CompoundZodValidation({
    params: categoryIdParamSchema,
    body: updateCategorySchema,
  })
  async update(
    @Param() params: { id: string },
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(params.id, updateCategoryDto);
  }

  @Delete(':id')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  async remove(@Param() params: { id: string }): Promise<{ deleted: boolean }> {
    return this.categoriesService.remove(params.id);
  }
}
