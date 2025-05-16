import { Injectable } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './member.schema';
import { MemberRepository } from './member.repository';

@Injectable()
export class MembersService {
  constructor(private readonly memberRepository: MemberRepository) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const newMember = await this.memberRepository.create(createMemberDto);
    return await newMember;
  }

  async findAll(): Promise<Member[]> {
    const results = await this.memberRepository.findAll();
    return results;
  }

  async findOne(id: string): Promise<Member | null> {
    const result = await this.memberRepository.findById(id);
    return result;
  }

  async update(
    id: string,
    updateMemberDto: UpdateMemberDto,
  ): Promise<Member | null> {
    const result = await this.memberRepository.update(id, updateMemberDto);
    return result;
  }

  async remove(id: string): Promise<Member | null> {
    return await this.memberRepository.delete(id);
  }
}
