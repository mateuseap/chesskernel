import { Test } from '@nestjs/testing';
import { LeaderboardsService } from './leaderboards.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';

describe('LeaderboardsService', () => {
  let service: LeaderboardsService;

  const prisma = {
    userRating: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const entry = (username: string, rating: number) => ({
    user: { id: `id-${username}`, username, avatarUrl: null, country: null },
    rating,
    ratingDeviation: 60,
    gamesPlayed: 20,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        LeaderboardsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(LeaderboardsService);
  });

  describe('getLeaderboard', () => {
    it('returns the cached payload without touching the database on cache hit', async () => {
      const cached = { entries: [], total: 0, page: 1, limit: 50, totalPages: 0 };
      redis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getLeaderboard('blitz', 1, 50);

      expect(result).toEqual(cached);
      expect(redis.get).toHaveBeenCalledWith('leaderboard:blitz:1:50');
      expect(prisma.userRating.findMany).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('queries only players with at least 5 games, ranked by rating desc, on cache miss', async () => {
      redis.get.mockResolvedValue(null);
      prisma.userRating.findMany.mockResolvedValue([entry('alice', 1900), entry('bob', 1850)]);
      prisma.userRating.count.mockResolvedValue(2);

      const result = await service.getLeaderboard('blitz', 1, 50);

      expect(prisma.userRating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timeControl: 'blitz', gamesPlayed: { gte: 5 } },
          orderBy: { rating: 'desc' },
          skip: 0,
          take: 50,
        }),
      );
      expect(result.entries.map((e: { rank: number }) => e.rank)).toEqual([1, 2]);
      expect(result.entries[0].user.username).toBe('alice');
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('offsets ranks by the page skip', async () => {
      redis.get.mockResolvedValue(null);
      prisma.userRating.findMany.mockResolvedValue([entry('carol', 1700)]);
      prisma.userRating.count.mockResolvedValue(101);

      const result = await service.getLeaderboard('rapid', 3, 50);

      expect(result.entries[0].rank).toBe(101);
      expect(result.totalPages).toBe(3);
    });

    it('caches the computed result for 300 seconds', async () => {
      redis.get.mockResolvedValue(null);
      prisma.userRating.findMany.mockResolvedValue([]);
      prisma.userRating.count.mockResolvedValue(0);

      const result = await service.getLeaderboard('bullet', 1, 50);

      expect(redis.set).toHaveBeenCalledWith(
        'leaderboard:bullet:1:50',
        JSON.stringify(result),
        300,
      );
    });

    it('serves from the database when the cache read fails', async () => {
      redis.get.mockRejectedValue(new Error('redis down'));
      prisma.userRating.findMany.mockResolvedValue([entry('dave', 1600)]);
      prisma.userRating.count.mockResolvedValue(1);

      const result = await service.getLeaderboard('blitz', 1, 50);

      expect(result.entries).toHaveLength(1);
    });

    it('still returns the result when the cache write fails', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockRejectedValue(new Error('redis down'));
      prisma.userRating.findMany.mockResolvedValue([]);
      prisma.userRating.count.mockResolvedValue(0);

      const result = await service.getLeaderboard('blitz', 1, 50);

      expect(result.total).toBe(0);
    });
  });

  describe('getUserRank', () => {
    it('returns null when the user has no rating record', async () => {
      prisma.userRating.findUnique.mockResolvedValue(null);
      expect(await service.getUserRank('u1', 'blitz')).toBeNull();
    });

    it('returns null for provisional players with fewer than 5 games', async () => {
      prisma.userRating.findUnique.mockResolvedValue({ rating: 1500, gamesPlayed: 4 });
      expect(await service.getUserRank('u1', 'blitz')).toBeNull();
      expect(prisma.userRating.count).not.toHaveBeenCalled();
    });

    it('ranks the user as one plus the number of qualified higher-rated players', async () => {
      prisma.userRating.findUnique.mockResolvedValue({ rating: 1500, gamesPlayed: 10 });
      prisma.userRating.count.mockResolvedValue(7);

      const rank = await service.getUserRank('u1', 'blitz');

      expect(rank).toBe(8);
      expect(prisma.userRating.count).toHaveBeenCalledWith({
        where: {
          timeControl: 'blitz',
          gamesPlayed: { gte: 5 },
          rating: { gt: 1500 },
        },
      });
    });
  });
});
