import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './role.schema';
import { BaseRepository } from '../common/base.repository'; // Ajuste le chemin si besoin

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(@InjectModel(Role.name) private readonly roleModel: Model<Role>) {
    super(roleModel);
  }
}
