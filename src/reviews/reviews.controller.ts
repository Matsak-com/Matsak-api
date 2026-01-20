import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  approve(@Param('id') reviewId: string) {
    return this.reviewsService.approve(reviewId);
  }

  @Get('team/:teamId')
  getByTeam(@Param('teamId') teamId: string) {
    return this.reviewsService.getByTeam(teamId);
  }
}
