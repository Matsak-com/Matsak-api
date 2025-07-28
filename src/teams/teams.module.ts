import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { Team, TeamSchema } from './team.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamsRepository } from './teams.repository';
import { AwsS3Service } from 'src/aws/aws-s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Team.name, schema: TeamSchema }]),
  ],
  providers: [TeamsService, TeamsRepository, AwsS3Service],
  controllers: [TeamsController],
  exports: [TeamsService, TeamsRepository],
})
export class TeamsModule {}
