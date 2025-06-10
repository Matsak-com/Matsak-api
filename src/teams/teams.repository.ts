import { Model } from 'mongoose';
import { Team } from './team.schema'; 
import { BaseRepository } from '../common/base.repository'; 

export class TeamsRepository extends BaseRepository<Team> {
  constructor(protected readonly model: Model<Team>) {
    super(model);
  }

}
