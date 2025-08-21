import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { DetailProductService } from './detail-product.service';
import { CreateDetailProductDto } from './dto/create-detail-product.dto';
import { UpdateDetailProductDto } from './dto/update-detail-product.dto';
import {
  ZodValidation,
  CompoundZodValidation,
} from '../common/decorators/zod-validation.decorator';
import { createDetailProductSchema } from '../common/schemas/product.schemas';
import { idParamSchema } from '../common/schemas/common.schemas';

@Controller('detail-products')
export class DetailProductController {
  constructor(private readonly service: DetailProductService) {}

  @Post()
  @ZodValidation(createDetailProductSchema)
  create(@Body() dto: CreateDetailProductDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @CompoundZodValidation({ params: idParamSchema })
  findOne(@Param() params: { id: string }) {
    return this.service.findOne(params.id);
  }

  @Put(':id')
  @CompoundZodValidation({
    params: idParamSchema,
    body: createDetailProductSchema.partial(),
  })
  update(@Param() params: { id: string }, @Body() dto: UpdateDetailProductDto) {
    return this.service.update(params.id, dto);
  }

  @Delete(':id')
  @CompoundZodValidation({ params: idParamSchema })
  remove(@Param() params: { id: string }) {
    return this.service.remove(params.id);
  }
}
