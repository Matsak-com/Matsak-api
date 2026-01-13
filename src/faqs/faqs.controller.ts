import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CompoundZodValidation } from '../common/decorators/zod-validation.decorator';
import {
  createFaqSchema,
  updateFaqSchema,
  faqIdParamSchema,
  faqListQuerySchema,
  FaqListQuery,
} from '../common/schemas/faq.schemas';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Faq } from './faq.schema';
import { FaqsService } from './faqs.service';

@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Post()
  @CompoundZodValidation({ body: createFaqSchema })
  async create(@Body() createFaqDto: CreateFaqDto): Promise<Faq> {
    return this.faqsService.create(createFaqDto);
  }

  @Get()
  @CompoundZodValidation({ query: faqListQuerySchema })
  async findAll(@Query() query: FaqListQuery): Promise<Faq[]> {
    return this.faqsService.findAll({
      includeUnpublished: query.includeUnpublished,
      category: query.category,
      search: query.search,
    });
  }

  @Get(':id')
  @CompoundZodValidation({ params: faqIdParamSchema })
  async findOne(@Param() params: { id: string }): Promise<Faq> {
    return this.faqsService.findOne(params.id);
  }

  @Patch(':id')
  @CompoundZodValidation({ params: faqIdParamSchema, body: updateFaqSchema })
  async update(
    @Param() params: { id: string },
    @Body() updateFaqDto: UpdateFaqDto,
  ): Promise<Faq> {
    return this.faqsService.update(params.id, updateFaqDto);
  }

  @Delete(':id')
  @CompoundZodValidation({ params: faqIdParamSchema })
  async remove(@Param() params: { id: string }): Promise<{ deleted: boolean }> {
    return this.faqsService.remove(params.id);
  }
}
