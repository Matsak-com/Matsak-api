import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Role, RoleSchema } from './role.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesRepository } from './roles.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
  ],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository], 
  exports: [RolesService], 
})
export class RolesModule {}
