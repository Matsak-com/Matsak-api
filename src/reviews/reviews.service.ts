import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, Types } from 'mongoose';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, ReviewStatus } from './review.schema';
import { ReviewRepository } from './review.repository';
import { TeamRepository } from '../teams/team.repository';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly teamRepo: TeamRepository,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async create(dto: CreateReviewDto): Promise<Review> {
    const userObjectId = new Types.ObjectId(dto.userId);
    const teamObjectId = new Types.ObjectId(dto.teamId);
    const userIdMatcher = { $in: [userObjectId, dto.userId] } as any;
    const teamIdMatcher = { $in: [teamObjectId, dto.teamId] } as any;

    const lastReview = await this.reviewRepo.findOne({
      filter: {
        userId: userIdMatcher,
        teamId: teamIdMatcher,
        deleted_at: null,
        status: { $in: [ReviewStatus.PENDING, ReviewStatus.APPROVED] },
      } as any,
      options: {
        sort: { createdAt: -1 },
      },
    });

    if (lastReview) {
      if (lastReview.status === ReviewStatus.APPROVED) {
        throw new ConflictException('ALREADY_REVIEWED_TEAM_APPROVED');
      }

      if (lastReview.status === ReviewStatus.PENDING) {
        throw new ConflictException('REVIEW_ALREADY_PENDING');
      }
    }

    const isVerified = false;
    const status: ReviewStatus = ReviewStatus.PENDING;

    const createPayload = {
      ...dto,
      status,
      isVerified,
      teamId: teamObjectId,
      userId: userObjectId,
    } as any;

    const shouldUpdateTeamStats = false;

    // For pending reviews or when transactions are unsupported, write without a transaction.
    if (!this.supportsTransactions()) {
      try {
        const createdReview = (await this.reviewRepo.create({
          doc: createPayload,
        })) as Review;

        if (shouldUpdateTeamStats) {
          await this.updateTeamStats({
            teamId: createdReview.teamId,
            newRating: createdReview.rating,
          });
        }

        return createdReview;
      } catch (error: any) {
        if (error?.code === 11000) {
          throw new ConflictException('ALREADY_REVIEWED_TEAM');
        }
        throw error;
      }
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const createdReview = (await this.reviewRepo.create({
        doc: createPayload,
        options: { save: true },
      })) as Review;

      if (shouldUpdateTeamStats) {
        await this.updateTeamStats({
          session,
          teamId: createdReview.teamId,
          newRating: createdReview.rating,
        });
      }

      await session.commitTransaction();
      return createdReview;
    } catch (error: any) {
      await session.abortTransaction();
      if (error?.code === 11000) {
        throw new ConflictException('ALREADY_REVIEWED_TEAM');
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  async approve(reviewId: string): Promise<Review> {
    if (!this.supportsTransactions()) {
      const review = await this.reviewRepo.findOne({
        filter: { _id: reviewId } as any,
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (review.status === ReviewStatus.APPROVED) {
        return review as Review;
      }

      if (!review.isVerified) {
        throw new BadRequestException(
          'Only verified purchases can be approved.',
        );
      }

      const updated = await this.reviewRepo.update({
        id: reviewId,
        update: { status: ReviewStatus.APPROVED } as any,
      });

      if (!updated) {
        throw new NotFoundException('Review not found');
      }

      await this.updateTeamStats({
        teamId: updated.teamId,
        newRating: updated.rating,
      });

      return updated as Review;
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    let sessionEnded = false;
    const endSessionSafely = async () => {
      if (!sessionEnded) {
        session.endSession();
        sessionEnded = true;
      }
    };

    const abortAndEndSession = async () => {
      try {
        await session.abortTransaction();
      } finally {
        await endSessionSafely();
      }
    };

    try {
      const review = await this.reviewRepo.findOne({
        filter: { _id: reviewId } as any,
      });

      if (!review) {
        await abortAndEndSession();
        throw new NotFoundException('Review not found');
      }

      if (review.status === ReviewStatus.APPROVED) {
        await endSessionSafely();
        return review;
      }

      if (!review.isVerified) {
        await abortAndEndSession();
        throw new BadRequestException(
          'Only verified purchases can be approved.',
        );
      }

      review.status = ReviewStatus.APPROVED;
      const savedReview = await review.save({ session });

      await this.updateTeamStats({
        session,
        teamId: savedReview.teamId,
        newRating: savedReview.rating,
      });

      await session.commitTransaction();
      await endSessionSafely();
      return savedReview;
    } catch (error) {
      if (!sessionEnded) {
        await abortAndEndSession();
      }
      throw error;
    } finally {
      await endSessionSafely();
    }
  }

  async reject(reviewId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      filter: { _id: reviewId } as any,
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status === ReviewStatus.REJECTED) {
      return review as Review;
    }

    if (review.status === ReviewStatus.APPROVED) {
      throw new BadRequestException('APPROVED_REVIEW_CANNOT_BE_REJECTED');
    }

    review.status = ReviewStatus.REJECTED;
    return (await review.save()) as Review;
  }

  async getAll({ status }: { status?: ReviewStatus }): Promise<Review[]> {
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    return (await this.reviewRepo.findAll({
      filter: filter as any,
      options: {
        sort: { createdAt: -1 },
        populate: { path: 'userId', select: 'name firstname avatarFileKey' },
      },
    })) as Review[];
  }

  async getByTeam(teamId: string): Promise<Review[]> {
    return (await this.reviewRepo.findAll({
      filter: {
        teamId: new Types.ObjectId(teamId),
        status: ReviewStatus.APPROVED,
      } as any,
      options: {
        sort: { createdAt: -1 },
        populate: { path: 'userId', select: 'name firstname avatarFileKey' },
      },
    })) as Review[];
  }

  async delete(reviewId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      filter: { _id: reviewId } as any,
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.status = ReviewStatus.REJECTED;
    review.deleted_at = new Date();
    return (await review.save()) as Review;
  }

  private async updateTeamStats({
    session,
    teamId,
    newRating,
  }: {
    session?: ClientSession;
    teamId: Types.ObjectId | string;
    newRating: number;
  }) {
    const team = await this.teamRepo.findOne({
      filter: { _id: teamId } as any,
      options: session ? { session } : {},
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const oldCount = team.reviewCount ?? 0;
    const oldAverage = team.averageRating ?? 0;

    const updatedCount = oldCount + 1;
    const updatedAverageRaw =
      (oldAverage * oldCount + newRating) / updatedCount;
    team.reviewCount = updatedCount;
    team.averageRating = Math.round(updatedAverageRaw * 100) / 100;

    await team.save({ session });
  }

  private supportsTransactions(): boolean {
    const topology = (this.connection as any)?.client?.topology;
    const type = topology?.description?.type || topology?.s?.description?.type;
    return typeof type === 'string' && type.toLowerCase().includes('replica');
  }
}
