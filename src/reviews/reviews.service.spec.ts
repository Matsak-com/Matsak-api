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
import { User, UserRole, UserSchema } from '../users/user.schema';
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
  let userModel: Model<User>;

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
          { name: User.name, schema: UserSchema },
        ]),
      ],
      providers: [ReviewsService, ReviewRepository],
    }).compile();

    service = moduleRef.get(ReviewsService);
    connection = moduleRef.get(getConnectionToken());
    teamModel = moduleRef.get(getModelToken(Team.name));
    reviewModel = moduleRef.get(getModelToken(Review.name));
    userModel = moduleRef.get(getModelToken(User.name));

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

  const createUser = async (overrides: Partial<User> = {}) =>
    userModel.create({
      name: 'John',
      firstname: 'Doe',
      email: `user-${Date.now()}@example.com`,
      password: 'password123',
      role: UserRole.USER,
      ...overrides,
    });

  const toIdString = (doc: any): string =>
    doc?._id?.toString?.() ?? doc?.id?.toString?.();

  it('creates a pending review with default flags without changing team stats', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString());

    const review = await service.create(dto);
    const reloadedTeam = await teamModel.findById(team._id).lean();

    expect(review.status).toBe(ReviewStatus.PENDING);
    expect(review.isVerified).toBe(false);
    expect(reloadedTeam?.reviewCount).toBe(0);
    expect(reloadedTeam?.averageRating).toBe(0);
  });

  it('ignores incoming flags and keeps review pending, leaving team stats unchanged', async () => {
    const team = await createTeam();
    const baseDto = createReviewDto(team._id.toString(), { rating: 5 });
    const requestPayload: any = {
      ...baseDto,
      status: ReviewStatus.APPROVED,
      isVerified: true,
    };

    const review = await service.create(requestPayload);
    const reloadedTeam = await teamModel.findById(team._id).lean();

    expect(review.status).toBe(ReviewStatus.PENDING);
    expect(review.isVerified).toBe(false);
    expect(reloadedTeam?.reviewCount).toBe(0);
    expect(reloadedTeam?.averageRating).toBe(0);
  });

  it('approves a pending review and updates team stats once', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString());

    const pending = await service.create(dto);
    // Simulate verification performed elsewhere
    await reviewModel.updateOne(
      { _id: (pending as any)._id },
      { $set: { isVerified: true } },
    );
    const approved = await service.approve(toIdString(pending as any));
    const reloadedTeam = await teamModel.findById(team._id).lean();

    expect(approved.status).toBe(ReviewStatus.APPROVED);
    expect(reloadedTeam?.reviewCount).toBe(1);
    expect(reloadedTeam?.averageRating).toBe(dto.rating);
  });

  it('rejects approval for unverified reviews', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString());

    const pending = await service.create(dto);

    await expect(service.approve(toIdString(pending))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('prevents duplicate reviews per user/team', async () => {
    const team = await createTeam();
    const userId = new Types.ObjectId().toString();
    const dto = createReviewDto(team._id.toString(), { userId });

    await service.create(dto);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    const count = await reviewModel.countDocuments();
    expect(count).toBe(1);
  });

  it('blocks new review when an approved one exists', async () => {
    const team = await createTeam();
    const userId = new Types.ObjectId().toString();

    await reviewModel.create({
      rating: 4,
      content: 'Existing approved',
      status: ReviewStatus.APPROVED,
      isVerified: true,
      teamId: team._id,
      userId,
    });

    const dto = createReviewDto(team._id.toString(), { userId, rating: 5 });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    const count = await reviewModel.countDocuments({ teamId: team._id, userId });
    expect(count).toBe(1);
  });

  it('allows a new review when the previous one was rejected', async () => {
    const team = await createTeam();
    const userId = new Types.ObjectId().toString();

    await reviewModel.create({
      rating: 2,
      content: 'Old rejected review',
      status: ReviewStatus.REJECTED,
      isVerified: false,
      teamId: team._id,
      userId,
    });

    const dto = createReviewDto(team._id.toString(), { userId, rating: 5 });
    const review = await service.create(dto);

    expect(review.status).toBe(ReviewStatus.PENDING);
    expect(review.rating).toBe(5);
  });

  it('allows a new review when the previous one was soft-deleted', async () => {
    const team = await createTeam();
    const userId = new Types.ObjectId().toString();

    await reviewModel.create({
      rating: 3,
      content: 'Soft deleted review',
      status: ReviewStatus.PENDING,
      isVerified: false,
      teamId: team._id,
      userId,
      deleted_at: new Date(),
    });

    const dto = createReviewDto(team._id.toString(), { userId, rating: 4 });
    const review = await service.create(dto);

    expect(review.status).toBe(ReviewStatus.PENDING);
    expect(review.rating).toBe(4);
  });

  it('returns only approved reviews for a team and populates user data', async () => {
    const teamA = await createTeam();
    const teamB = await createTeam();
    const userA = await createUser({ name: 'Alice', firstname: 'Smith' });
    const userB = await createUser();

    await reviewModel.create({
      rating: 5,
      content: 'Approved review for team A',
      status: ReviewStatus.APPROVED,
      isVerified: true,
      teamId: teamA._id,
      userId: userA._id,
    });

    await reviewModel.create({
      rating: 3,
      content: 'Pending review for team A',
      status: ReviewStatus.PENDING,
      isVerified: true,
      teamId: teamA._id,
      userId: userB._id,
    });

    await reviewModel.create({
      rating: 4,
      content: 'Approved review for team B',
      status: ReviewStatus.APPROVED,
      isVerified: true,
      teamId: teamB._id,
      userId: userB._id,
    });

    const results = await service.getByTeam(teamA._id.toString());

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe(ReviewStatus.APPROVED);
    expect(results[0].teamId.toString()).toBe(teamA._id.toString());

    const populatedUser: any = (results[0] as any).userId;
    expect(populatedUser).toBeTruthy();
    expect(populatedUser._id.toString()).toBe(userA._id.toString());
    expect(populatedUser.name).toBe('Alice');
    expect(populatedUser.firstname).toBe('Smith');
  });

  it('returns an empty array when a team has no approved reviews', async () => {
    const team = await createTeam();

    const results = await service.getByTeam(team._id.toString());

    expect(results).toEqual([]);
  });

  it('rejects a pending review to set status REJECTED', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString());

    const pending = await service.create(dto);

    const rejected = await service.reject(toIdString(pending));

    expect(rejected.status).toBe(ReviewStatus.REJECTED);
  });

  it('throws when trying to reject an approved review', async () => {
    const team = await createTeam();
    const dto = createReviewDto(team._id.toString());

    const pending = await service.create(dto);
    await reviewModel.updateOne(
      { _id: (pending as any)._id },
      { $set: { isVerified: true } },
    );
    await service.approve(toIdString(pending));

    await expect(service.reject(toIdString(pending))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('soft deletes a review and excludes it from listings', async () => {
    const team = await createTeam();
    const user = await createUser({ name: 'SoftDelete', firstname: 'User' });

    const created = await reviewModel.create({
      rating: 4,
      content: 'To be deleted',
      status: ReviewStatus.PENDING,
      isVerified: false,
      teamId: team._id,
      userId: user._id,
    });

    const deleted = await service.delete(created._id.toString());

    expect(deleted.deleted_at).toBeInstanceOf(Date);

    const results = await service.getAll({});
    expect(results).toHaveLength(0);
  });

  it('returns all non-deleted reviews when no status filter is provided', async () => {
    const team = await createTeam();
    const userApproved = await createUser({
      name: 'NoFilterA',
      firstname: 'User',
    });
    const userPending = await createUser({
      name: 'NoFilterB',
      firstname: 'User',
    });
    const userDeleted = await createUser({
      name: 'NoFilterC',
      firstname: 'User',
    });

    const approved = await reviewModel.create({
      rating: 5,
      content: 'Approved review',
      status: ReviewStatus.APPROVED,
      isVerified: true,
      teamId: team._id,
      userId: userApproved._id,
    });

    const pending = await reviewModel.create({
      rating: 3,
      content: 'Pending review',
      status: ReviewStatus.PENDING,
      isVerified: false,
      teamId: team._id,
      userId: userPending._id,
    });

    const deleted = await reviewModel.create({
      rating: 1,
      content: 'Deleted review',
      status: ReviewStatus.PENDING,
      isVerified: false,
      teamId: team._id,
      userId: userDeleted._id,
      deleted_at: new Date(),
    });

    const results = await service.getAll({});

    const ids = results.map((r: any) => r._id.toString());
    expect(results).toHaveLength(2);
    expect(ids).toEqual(
      expect.arrayContaining([approved._id.toString(), pending._id.toString()]),
    );
    expect(ids).not.toContain(deleted._id.toString());
  });

  it('filters reviews by status when provided', async () => {
    const team = await createTeam();
    const approvedUser = await createUser({
      name: 'FilterA',
      firstname: 'User',
    });
    const pendingUser = await createUser({
      name: 'FilterB',
      firstname: 'User',
    });

    await reviewModel.create({
      rating: 5,
      content: 'Approved review',
      status: ReviewStatus.APPROVED,
      isVerified: true,
      teamId: team._id,
      userId: approvedUser._id,
    });

    const pending = await reviewModel.create({
      rating: 4,
      content: 'Pending review',
      status: ReviewStatus.PENDING,
      isVerified: false,
      teamId: team._id,
      userId: pendingUser._id,
    });

    const results = await service.getAll({ status: ReviewStatus.PENDING });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe(ReviewStatus.PENDING);
    expect((results[0] as any).userId._id.toString()).toBe(
      pendingUser._id.toString(),
    );
    expect((results[0] as any)._id.toString()).toBe(pending._id.toString());
  });
});
