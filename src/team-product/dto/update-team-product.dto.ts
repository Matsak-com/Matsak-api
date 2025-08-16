import { PartialType } from '@nestjs/mapped-types';
import { CreateTeamProductDto } from './create-team-product.dto';

export class UpdateTeamProductDto extends PartialType(CreateTeamProductDto) {}
