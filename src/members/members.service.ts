import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './member.schema';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Member.name) private readonly memberModel: Model<Member>,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const newMember = new this.memberModel(createMemberDto);
    return await newMember.save();
  }

  async findAll(): Promise<Member[]> {
    return await this.memberModel.find();
  }

  async findOne(id: string): Promise<Member | null> {
    return await this.memberModel.findById(id);
  }

  async update(
    id: string,
    updateMemberDto: UpdateMemberDto,
  ): Promise<Member | null> {
    return await this.memberModel.findByIdAndUpdate(id, updateMemberDto, {
      new: true,
    });
  }

  async remove(id: string): Promise<Member | null> {
    return await this.memberModel.findByIdAndDelete(id);
  }
}
