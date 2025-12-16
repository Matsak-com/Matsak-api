import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { SubCategoriesService } from './sub-categories.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import { ZodMultipart } from '../common/decorators/zod-multipart.decorator';
import {
  createSubCategorySchema,
  updateSubCategorySchema,
  subCategoryIdParamSchema,
  categoryIdParamSchema,
} from '../common/schemas/sub-category.schemas';

@Controller('subcategories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Post()
  @ZodMultipart(createSubCategorySchema, 'imageUrl')
  create(
    @Body() createSubCategoryDto: CreateSubCategoryDto,
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
  ) {
    return this.subCategoriesService.create({
      ...createSubCategoryDto,
      imageUrl,
    });
  }

  @Get()
  findAll() {
    return this.subCategoriesService.findAll();
  }

  @Get('by-category/:categoryId')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  findByCategory(@Param() params: { categoryId: string }) {
    return this.subCategoriesService.findByCategory(params.categoryId);
  }

  @Get('tree/:categoryId')
  @CompoundZodValidation({ params: categoryIdParamSchema })
  getCategoryTree(@Param() params: { categoryId: string }) {
    return this.subCategoriesService.getCategoryTree(params.categoryId);
  }

  @Get(':id')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  findOne(@Param() params: { id: string }) {
    return this.subCategoriesService.findOne(params.id);
  }

  @Get(':id/children')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  getChildren(@Param() params: { id: string }) {
    return this.subCategoriesService.getChildren(params.id);
  }

  @Get(':id/descendants')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  getDescendants(@Param() params: { id: string }) {
    return this.subCategoriesService.getDescendants(params.id);
  }

  @Get(':id/ancestors')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  getAncestors(@Param() params: { id: string }) {
    return this.subCategoriesService.getAncestors(params.id);
  }

  @Put(':id')
  @ZodMultipart(updateSubCategorySchema, 'imageUrl')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  update(
    @Param() params: { id: string },
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
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
  ) {
    return this.subCategoriesService.update(params.id, {
      ...updateSubCategoryDto,
      imageUrl,
    });
  }

  @Delete(':id')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  remove(
    @Param() params: { id: string },
  ): Promise<{ deleted: boolean; childrenDeleted: number }> {
    return this.subCategoriesService.remove(params.id);
  }

  @Put(':id/move')
  @CompoundZodValidation({ params: subCategoryIdParamSchema })
  moveSubCategory(
    @Param() params: { id: string },
    @Body() body: { newParentId: string | null },
  ) {
    return this.subCategoriesService.moveSubCategory(
      params.id,
      body.newParentId,
    );
  }
}
