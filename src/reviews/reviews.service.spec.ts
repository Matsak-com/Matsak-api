import { Test, TestingModule } from '@nestjs/testing';
import {
  MongooseModule,
  getConnectionToken,
  getModelToken,
} from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { ReviewsService } from './reviews.service';
import { Review, ReviewSchema, ReviewStatus } from './review.schema';
import { Team, TeamSchema } from '../teams/team.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReviewRepository } from './review.repository';

describe('ReviewsService', () => {
  let moduleRef: TestingModule;
  let service: ReviewsService;
  let connection: Connection;
  let replset: MongoMemoryReplSet;
  let teamModel: Model<Team>;
  let reviewModel: Model<Review>;

  jest.setTimeout(120000);

  beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replset.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: Team.name, schema: TeamSchema },
          { name: Review.name, schema: ReviewSchema },
        ]),
      ],
      providers: [ReviewsService, ReviewRepository],
    }).compile();

    service = moduleRef.get(ReviewsService);
    connection = moduleRef.get(getConnectionToken());
    teamModel = moduleRef.get(getModelToken(Team.name));
    reviewModel = moduleRef.get(getModelToken(Review.name));

    await reviewModel.createIndexes();
  });

  beforeEach(async () => {
    await reviewModel.syncIndexes();
  });

  afterEach(async () => {
    if (connection?.db) {
      await connection.db.dropDatabase();
    }
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
    if (replset) await replset.stop();
  });

  const createTeam = async () =>
    teamModel.create({
      email: `team-${Date.now()}@example.com`,
      phone: '0000000000',
      language: 'en',
      timezone: 'UTC',
      slug: `team-${Date.now()}`,
      name: 'Demo Team',
    });

  const createReviewDto = (
    teamId: string,
    overrides: Partial<CreateReviewDto> = {},
  ): CreateReviewDto => ({
    rating: 4,
    content: 'Great product, highly recommended',
    teamId,
    userId: new Types.ObjectId().toString(),
    ...overrides,
  });

  const toIdString = (doc: any): string =>
    doc?._id?.toString?.() ?? doc?.id?.toString?.();

  it('creates a pending review without changing product stats', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString(), { isVerified: true });

    const review = await service.create(dto);
    const reloadedTeam = await teamModel.findById(team._id).lean();

    expect(review.status).toBe(ReviewStatus.PENDING);
    expect(reloadedTeam?.reviewCount).toBe(0);
    expect(reloadedTeam?.averageRating).toBe(0);
  });

  it('creates an approved review and updates product stats', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString(), {
      rating: 5,
      status: ReviewStatus.APPROVED,
      isVerified: true,
    });

    const review = await service.create(dto);
    const reloadedTeam = await teamModel.findById(team._id).lean();

    expect(review.status).toBe(ReviewStatus.APPROVED);
    expect(reloadedTeam?.reviewCount).toBe(1);
    expect(reloadedTeam?.averageRating).toBe(5);
  });

  it('rejects approving on create when not verified', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString(), {
      status: ReviewStatus.APPROVED,
      isVerified: false,
    });

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('approves a pending review and updates product stats once', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString(), { isVerified: true });

    const pending = await service.create(dto);
    const approved = await service.approve(toIdString(pending as any));
    const reloadedTeam = await teamModel.findById(team._id).lean();

    expect(approved.status).toBe(ReviewStatus.APPROVED);
    expect(reloadedTeam?.reviewCount).toBe(1);
    expect(reloadedTeam?.averageRating).toBe(dto.rating);
  });

  it('rejects approval for unverified reviews', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString(), { isVerified: false });

    const pending = await service.create(dto);

    await expect(service.approve(toIdString(pending))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('prevents duplicate reviews per user/product', async () => {
    const team = await createTeam();
    const userId = new Types.ObjectId().toString();
    const dto = createReviewDto(team._id.toString(), { userId });

    await service.create(dto);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    const count = await reviewModel.countDocuments();
    expect(count).toBe(1);
  });
});
