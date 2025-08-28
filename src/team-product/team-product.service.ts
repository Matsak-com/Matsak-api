import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateTeamProductDto } from './dto/create-team-product.dto';
import { UpdateTeamProductDto } from './dto/update-team-product.dto';
import { TeamProduct } from './team-product.schema';
import { TeamProductRepository } from './team-product.repository';

@Injectable()
export class TeamProductService {
  constructor(private readonly teamProductRepository: TeamProductRepository) {}

  private mapDtoToModel(dto: CreateTeamProductDto | UpdateTeamProductDto) {
    return {
      ...dto,
      product: new Types.ObjectId(dto.product),
      team: new Types.ObjectId(dto.team),
    };
  }

  async create(dto: CreateTeamProductDto): Promise<TeamProduct> {
    const data = this.mapDtoToModel(dto);
    return this.teamProductRepository.create({ doc: data });
  }

  async findAll(): Promise<TeamProduct[]> {
    return this.teamProductRepository.findAll();
  }

  async findById(id: string): Promise<TeamProduct | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.teamProductRepository.findById({ id });
  }

  async update(
    id: string,
    dto: UpdateTeamProductDto,
  ): Promise<TeamProduct | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const data = this.mapDtoToModel(dto);
    return this.teamProductRepository.update({ id, update: data });
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.teamProductRepository.delete({ id });
    return result != null;
  }
}
