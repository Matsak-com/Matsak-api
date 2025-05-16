import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Member, MemberSchema } from './member.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { MemberRepository } from './member.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Member.name, schema: MemberSchema }]),
  ],
  controllers: [MembersController],
  providers: [MembersService, MemberRepository],
  exports: [MembersService, MemberRepository],
})
export class MembersModule {}
