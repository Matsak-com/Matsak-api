import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  teamIdParamSchema,
  reviewIdParamSchema,
} from '../common/schemas/reviews.schemas';
import { CompoundZodValidation } from 'src/common/decorators/zod-validation.decorator';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { UserPayload } from '../auth/jwt/jwt.strategy';
import { UserRole } from '../users/user.schema';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: UserPayload) {
    if (dto.userId && dto.userId !== user.userId) {
      throw new BadRequestException('USER_ID_MISMATCH');
    }

    return this.reviewsService.create({ ...dto, userId: user.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  @CompoundZodValidation({ params: reviewIdParamSchema })
  approve(@Param() params: { id: string }, @CurrentUser() user: UserPayload) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
      throw new ForbiddenException('FORBIDDEN_REVIEW_APPROVAL');
    }

    return this.reviewsService.approve(params.id);
  }

  @Get('team/:teamId')
  @CompoundZodValidation({ params: teamIdParamSchema })
  getByTeam(@Param() params: { teamId: string }) {
    return this.reviewsService.getByTeam(params.teamId);
  }
}
