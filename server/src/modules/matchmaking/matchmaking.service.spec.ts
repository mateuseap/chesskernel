import { Test } from '@nestjs/testing';
import { MatchmakingService } from './matchmaking.service';
import { RedisService } from '../../database/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { GamesService } from '../games/games.service';
import { RatingsService } from '../ratings/ratings.service';

/** In-memory stand-in for the RedisService key/value and sorted-set commands. */
function createFakeRedis() {
  const kv = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();
  return {
    kv,
    zsets,
    get: jest.fn(async (key: string) => kv.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      kv.set(key, value);
    }),
    del: jest.fn(async (...keys: string[]) => {
      for (const key of keys) kv.delete(key);
    }),
    zadd: jest.fn(async (key: string, score: number, member: string) => {
      const set = zsets.get(key) ?? new Map<string, number>();
      set.set(member, score);
      zsets.set(key, set);
    }),
    zrem: jest.fn(async (key: string, member: string) => {
      zsets.get(key)?.delete(member);
    }),
    zscore: jest.fn(async (key: string, member: string) => {
      const score = zsets.get(key)?.get(member);
      return score === undefined ? null : String(score);
    }),
    zrangebyscore: jest.fn(async (key: string, min: number | string, max: number | string) => {
      const set = zsets.get(key);
      if (!set) return [];
      const lo = min === '-inf' ? -Infinity : Number(min);
      const hi = max === '+inf' ? Infinity : Number(max);
      return [...set.entries()]
        .filter(([, score]) => score >= lo && score <= hi)
        .sort((a, b) => a[1] - b[1])
        .map(([member]) => member);
    }),
  };
}

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let redis: ReturnType<typeof createFakeRedis>;

  const gamesService = { createGame: jest.fn() };
  const ratingsService = { getRatingForUser: jest.fn() };

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    redis = createFakeRedis();
    gamesService.createGame.mockResolvedValue({ id: 'game-1' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        { provide: RedisService, useValue: redis },
        { provide: PrismaService, useValue: {} },
        { provide: GamesService, useValue: gamesService },
        { provide: RatingsService, useValue: ratingsService },
      ],
    }).compile();

    service = moduleRef.get(MatchmakingService);
  });

  describe('joinQueue', () => {
    it('throws for an unknown time control key', async () => {
      await expect(service.joinQueue('u1', 'warp_0_0')).rejects.toThrow(
        'Unknown time control: warp_0_0',
      );
    });

    it('queues a lone player under their rating and returns no match', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });

      const result = await service.joinQueue('u1', 'blitz_5_0');

      expect(result).toBeNull();
      expect(await redis.zscore('matchmaking:blitz_5_0', 'u1')).toBe('1500');
      expect(await service.isInQueue('u1')).toBe('blitz_5_0');
    });

    it('defaults unrated players to 1200', async () => {
      ratingsService.getRatingForUser.mockResolvedValue(null);

      await service.joinQueue('u1', 'blitz_5_0');

      expect(await redis.zscore('matchmaking:blitz_5_0', 'u1')).toBe('1200');
    });

    it('matches two players within the base 100 rating window and empties the queue', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });
      await service.joinQueue('u1', 'blitz_5_0');

      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1560 });
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const result = await service.joinQueue('u2', 'blitz_5_0');

      expect(result).toEqual({ gameId: 'game-1', whiteId: 'u2', blackId: 'u1' });
      expect(gamesService.createGame).toHaveBeenCalledWith('u2', 'u1', 'blitz_5_0');
      expect(await service.isInQueue('u1')).toBeNull();
      expect(await service.isInQueue('u2')).toBeNull();
    });

    it('assigns the joining player black when the coin flip favors the opponent', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });
      await service.joinQueue('u1', 'blitz_5_0');

      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const result = await service.joinQueue('u2', 'blitz_5_0');

      expect(result).toEqual({ gameId: 'game-1', whiteId: 'u1', blackId: 'u2' });
    });

    it('does not match players more than 100 points apart with no wait time', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });
      await service.joinQueue('u1', 'blitz_5_0');

      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1650 });
      const result = await service.joinQueue('u2', 'blitz_5_0');

      expect(result).toBeNull();
      expect(gamesService.createGame).not.toHaveBeenCalled();
      expect(await service.isInQueue('u1')).toBe('blitz_5_0');
      expect(await service.isInQueue('u2')).toBe('blitz_5_0');
    });

    it('expands the window by 50 points per 10s of waiting, capped at 400', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });
      await service.joinQueue('opponent', 'blitz_5_0');

      // First Date.now stamps the meta, later calls simulate 120s in the queue,
      // which yields the capped 400-point window (100 + 12 * 50 > 400).
      const t0 = Date.now();
      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(t0);
      nowSpy.mockReturnValue(t0 + 120_000);

      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1850 });
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const result = await service.joinQueue('u2', 'blitz_5_0');

      expect(result).toEqual({ gameId: 'game-1', whiteId: 'u2', blackId: 'opponent' });
    });

    it('does not match players queued for different time controls', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });
      await service.joinQueue('u1', 'blitz_5_0');

      const result = await service.joinQueue('u2', 'rapid_10_0');

      expect(result).toBeNull();
      expect(gamesService.createGame).not.toHaveBeenCalled();
    });

    it('re-joining moves the player to the new queue instead of duplicating entries', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });
      await service.joinQueue('u1', 'blitz_5_0');
      await service.joinQueue('u1', 'rapid_10_0');

      expect(await redis.zscore('matchmaking:blitz_5_0', 'u1')).toBeNull();
      expect(await service.isInQueue('u1')).toBe('rapid_10_0');
    });
  });

  describe('leaveQueue / isInQueue', () => {
    it('leaveQueue removes the player and their meta from every time control queue', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });
      await service.joinQueue('u1', 'blitz_5_0');

      await service.leaveQueue('u1');

      expect(await service.isInQueue('u1')).toBeNull();
      expect(await redis.get('matchmaking:meta:blitz_5_0:u1')).toBeNull();
    });

    it('isInQueue returns null for a player who never joined', async () => {
      expect(await service.isInQueue('ghost')).toBeNull();
    });
  });

  describe('processExpiredQueueEntries', () => {
    it('removes entries older than 5 minutes and entries with missing meta', async () => {
      ratingsService.getRatingForUser.mockResolvedValue({ rating: 1500 });
      await service.joinQueue('stale', 'blitz_5_0');
      redis.kv.set(
        'matchmaking:meta:blitz_5_0:stale',
        JSON.stringify({ joinedAt: Date.now() - 301_000, timeControlKey: 'blitz_5_0' }),
      );

      ratingsService.getRatingForUser.mockResolvedValue({ rating: 2000 });
      await service.joinQueue('fresh', 'blitz_5_0');

      await redis.zadd('matchmaking:blitz_5_0', 1400, 'no-meta');

      await service.processExpiredQueueEntries();

      expect(await redis.zscore('matchmaking:blitz_5_0', 'stale')).toBeNull();
      expect(await redis.zscore('matchmaking:blitz_5_0', 'no-meta')).toBeNull();
      expect(await redis.zscore('matchmaking:blitz_5_0', 'fresh')).toBe('2000');
    });
  });

  describe('createBotGame', () => {
    it('creates a bot game passing the user as both seats with difficulty flag', async () => {
      await service.createBotGame('u1', 'rapid_10_0', 'hard', 'white');

      expect(gamesService.createGame).toHaveBeenCalledWith('u1', 'u1', 'rapid_10_0', true, 'hard');
    });

    it('resolves a random color preference without failing', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.7);

      await service.createBotGame('u1', 'blitz_3_0', 'easy', 'random');

      expect(gamesService.createGame).toHaveBeenCalledWith('u1', 'u1', 'blitz_3_0', true, 'easy');
    });
  });
});
