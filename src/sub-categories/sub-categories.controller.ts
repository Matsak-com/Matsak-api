import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SubCategoriesService } from './sub-categories.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import {
  ZodValidation,
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import {
  createSubCategorySchema,
  updateSubCategorySchema,
  subCategoryIdParamSchema,
  categoryIdParamSchema,
} from '../common/schemas/sub-category.schemas';

@Controller('sub-categories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Post()
  @ZodValidation(createSubCategorySchema)
  create(@Body() createSubCategoryDto: CreateSubCategoryDto) {
    return this.subCategoriesService.create(createSubCategoryDto);
  }

  @Get()
  findAll() {
    return this.subCategoriesService.findAll();
  }

  @Get(':id')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  findOne(@Param() params: { id: string }) {
    return this.subCategoriesService.findOne(params.id);
  }

  @Patch(':id')
  @CompoundZodValidation({
    params: subCategoryIdParamSchema,
    body: updateSubCategorySchema,
  })
  update(
    @Param() params: { id: string },
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
  ) {
    return this.subCategoriesService.update(params.id, updateSubCategoryDto);
  }

  @Delete(':id')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  remove(@Param() params: { id: string }) {
    return this.subCategoriesService.remove(params.id);
  }

  @Get('/by-category/:categoryId')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  findByCategory(@Param() params: { categoryId: string }) {
    return this.subCategoriesService.findByCategory(params.categoryId);
  }
}
