import { IsMongoId, IsNotEmpty } from 'class-validator';

export class SwitchTeamDto {
  @IsMongoId()
  @IsNotEmpty()
  teamId: string;
}
