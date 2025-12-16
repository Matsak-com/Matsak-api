import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Member, MemberSchema } from './member.schema';
import { MemberRepository } from './member.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Member.name, schema: MemberSchema }]),
    UsersModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, MemberRepository],
  exports: [MembersService, MemberRepository],
})
export class MembersModule {}
