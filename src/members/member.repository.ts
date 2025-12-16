import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base.repository';
import { Member, MemberDocument } from './member.schema';

@Injectable()
export class MemberRepository extends BaseRepository<MemberDocument> {
  constructor(
    @InjectModel(Member.name)
    memberModel: Model<MemberDocument>,
  ) {
    super(memberModel);
  }
}
