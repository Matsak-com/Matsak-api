import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { TeamProductService } from './team-product.service';
import { CreateTeamProductDto } from './dto/create-team-product.dto';
import { UpdateTeamProductDto } from './dto/update-team-product.dto';
import { ParseObjectIdPipe } from '../common/pipes/parseObjectId.pipe';
import { TeamProduct } from './team-product.schema';

@Controller('team-products')
export class TeamProductController {
  constructor(private readonly teamProductService: TeamProductService) {}

  @Post()
  async create(@Body() createDto: CreateTeamProductDto): Promise<TeamProduct> {
    return this.teamProductService.create(createDto);
  }

  @Get()
  async findAll(): Promise<TeamProduct[]> {
    return this.teamProductService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<TeamProduct> {
    const item = await this.teamProductService.findById(id);
    if (!item) throw new NotFoundException(`TeamProduct with id ${id} not found`);
    return item;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateDto: UpdateTeamProductDto,
  ): Promise<TeamProduct> {
    const updated = await this.teamProductService.update(id, updateDto);
    if (!updated) throw new NotFoundException(`TeamProduct with id ${id} not found`);
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id', ParseObjectIdPipe) id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.teamProductService.delete(id);
    if (!deleted) throw new NotFoundException(`TeamProduct with id ${id} not found`);
    return { deleted };
  }
}
