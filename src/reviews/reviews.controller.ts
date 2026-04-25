import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  teamIdParamSchema,
  reviewIdParamSchema,
  reviewQuerySchema,
  reviewStatusBodySchema,
} from '../common/schemas/reviews.schemas';
import { CompoundZodValidation } from 'src/common/decorators/zod-validation.decorator';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { UserPayload } from '../auth/jwt/jwt.strategy';
import { UserRole } from '../users/user.schema';
import { ReviewStatus } from './review.schema';
import { ERRORS } from '../common/errors';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: UserPayload) {
    if (dto.userId && dto.userId !== user.userId) {
      throw new BadRequestException(ERRORS.USER_ID_MISMATCH);
    }

    return this.reviewsService.create({ ...dto, userId: user.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post(':id/approve')
  @CompoundZodValidation({ params: reviewIdParamSchema })
  approve(@Param() params: { id: string }) {
    return this.reviewsService.approve(params.id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch(':id')
  @CompoundZodValidation({
    params: reviewIdParamSchema,
    body: reviewStatusBodySchema,
  })
  reject(@Param() params: { id: string }) {
    return this.reviewsService.reject(params.id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Delete(':id')
  @CompoundZodValidation({ params: reviewIdParamSchema })
  delete(@Param() params: { id: string }) {
    return this.reviewsService.delete(params.id);
  }

  @Get('team/:teamId')
  @CompoundZodValidation({ params: teamIdParamSchema })
  getByTeam(@Param() params: { teamId: string }) {
    return this.reviewsService.getByTeam(params.teamId);
  }

  @Get()
  @CompoundZodValidation({ query: reviewQuerySchema })
  getAll(@Query() query: { status?: ReviewStatus }) {
    return this.reviewsService.getAll({ status: query.status });
  }
}
