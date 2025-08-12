import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTeamProductDto } from './dto/create-team-product.dto';
import { UpdateTeamProductDto } from './dto/update-team-product.dto';
import { TeamProduct, TeamProductDocument } from './team-product.shema';

@Injectable()
export class TeamProductService {
  constructor(
    @InjectModel(TeamProduct.name) private readonly model: Model<TeamProductDocument>,
  ) {}

  private mapDtoToModel(dto: CreateTeamProductDto | UpdateTeamProductDto) {
    return {
      ...dto,
      product: new Types.ObjectId(dto.product),
      team: new Types.ObjectId(dto.team),
    };
  }

  async create(dto: CreateTeamProductDto): Promise<TeamProduct> {
    const data = this.mapDtoToModel(dto);
    const created = new this.model(data);
    return created.save();
  }

  async findAll(): Promise<TeamProduct[]> {
    return this.model.find().exec();
  }

  async findById(id: string): Promise<TeamProduct | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).exec();
  }

  async update(id: string, dto: UpdateTeamProductDto): Promise<TeamProduct | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const data = this.mapDtoToModel(dto);
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const res = await this.model.findByIdAndDelete(id).exec();
    return res != null;
  }
}
