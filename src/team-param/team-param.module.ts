import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamParamService } from './team-param.service';
import { TeamParamController } from './team-param.controller';
import { TeamParamRepository } from './team-param.repository';
import {
  TeamParam,
  TeamParamSchema,
  ShowNumberParamSchema,
  ShowEmailParamSchema,
  CurrencyParamSchema,
} from './team-param.schema';

// Setup discriminators on the base schema
TeamParamSchema.discriminator('ShowNumberParam', ShowNumberParamSchema);
TeamParamSchema.discriminator('ShowEmailParam', ShowEmailParamSchema);
TeamParamSchema.discriminator('CurrencyParam', CurrencyParamSchema);

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamParam.name, schema: TeamParamSchema },
    ]),
  ],
  controllers: [TeamParamController],
  providers: [TeamParamService, TeamParamRepository],
  exports: [TeamParamService, TeamParamRepository],
})
export class TeamParamModule {}
