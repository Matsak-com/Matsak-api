import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class SwitchTeamDto {
  @IsMongoId()
  @IsNotEmpty()
  teamId: Types.ObjectId;
}
