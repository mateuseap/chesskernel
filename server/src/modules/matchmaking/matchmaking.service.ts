import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TimeControl } from '@prisma/client';
import { RedisService } from '../../database/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { GamesService } from '../games/games.service';
import { RatingsService } from '../ratings/ratings.service';
import { TIME_CONTROLS } from '@chesskernel/shared';

const QUEUE_KEY = (timeControlKey: string) => `matchmaking:${timeControlKey}`;
const QUEUE_META_KEY = (timeControlKey: string, userId: string) =>
  `matchmaking:meta:${timeControlKey}:${userId}`;

interface QueueMeta {
  joinedAt: number;
  timeControlKey: string;
}

interface MatchResult {
  gameId: string;
  whiteId: string;
  blackId: string;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly gamesService: GamesService,
    private readonly ratingsService: RatingsService,
  ) {}

  async joinQueue(userId: string, timeControlKey: string): Promise<MatchResult | null> {
    const tc = TIME_CONTROLS[timeControlKey];
    if (!tc) throw new Error(`Unknown time control: ${timeControlKey}`);

    await this.leaveQueue(userId);

    const rating = await this.ratingsService.getRatingForUser(userId, tc.type as TimeControl);
    const playerRating = rating?.rating ?? 1200;

    await this.redis.zadd(QUEUE_KEY(timeControlKey), playerRating, userId);
    await this.redis.set(
      QUEUE_META_KEY(timeControlKey, userId),
      JSON.stringify({ joinedAt: Date.now(), timeControlKey }),
      300,
    );

    return this.tryMatch(userId, playerRating, timeControlKey);
  }

  async leaveQueue(userId: string): Promise<void> {
    for (const key of Object.keys(TIME_CONTROLS)) {
      await this.redis.zrem(QUEUE_KEY(key), userId);
      await this.redis.del(QUEUE_META_KEY(key, userId));
    }
  }

  async isInQueue(userId: string): Promise<string | null> {
    for (const key of Object.keys(TIME_CONTROLS)) {
      const score = await this.redis.zscore(QUEUE_KEY(key), userId);
      if (score !== null) return key;
    }
    return null;
  }

  private async tryMatch(
    userId: string,
    playerRating: number,
    timeControlKey: string,
  ): Promise<MatchResult | null> {
    const metaRaw = await this.redis.get(QUEUE_META_KEY(timeControlKey, userId));
    if (!metaRaw) return null;

    const meta: QueueMeta = JSON.parse(metaRaw);
    const waitSeconds = (Date.now() - meta.joinedAt) / 1000;

    const baseRange = 100;
    const expansionPerTenSeconds = 50;
    const maxRange = 400;
    const range = Math.min(maxRange, baseRange + Math.floor(waitSeconds / 10) * expansionPerTenSeconds);

    const candidates = await this.redis.zrangebyscore(
      QUEUE_KEY(timeControlKey),
      playerRating - range,
      playerRating + range,
    );

    const opponent = candidates.find((id) => id !== userId);
    if (!opponent) return null;

    await this.redis.zrem(QUEUE_KEY(timeControlKey), userId);
    await this.redis.zrem(QUEUE_KEY(timeControlKey), opponent);
    await this.redis.del(QUEUE_META_KEY(timeControlKey, userId));
    await this.redis.del(QUEUE_META_KEY(timeControlKey, opponent));

    const isWhiteFirst = Math.random() < 0.5;
    const whiteId = isWhiteFirst ? userId : opponent;
    const blackId = isWhiteFirst ? opponent : userId;

    const game = await this.gamesService.createGame(whiteId, blackId, timeControlKey);

    return { gameId: game.id, whiteId, blackId };
  }

  @Cron('*/30 * * * * *')
  async processExpiredQueueEntries(): Promise<void> {
    for (const key of Object.keys(TIME_CONTROLS)) {
      const members = await this.redis.zrangebyscore(QUEUE_KEY(key), '-inf', '+inf');
      for (const userId of members) {
        const metaRaw = await this.redis.get(QUEUE_META_KEY(key, userId));
        if (!metaRaw) {
          await this.redis.zrem(QUEUE_KEY(key), userId);
          continue;
        }
        const meta: QueueMeta = JSON.parse(metaRaw);
        if (Date.now() - meta.joinedAt > 300_000) {
          await this.redis.zrem(QUEUE_KEY(key), userId);
          await this.redis.del(QUEUE_META_KEY(key, userId));
          this.logger.log(`Removed expired queue entry for user ${userId}`);
        }
      }
    }
  }

  async createBotGame(userId: string, timeControlKey: string, difficulty: string, colorPreference: 'white' | 'black' | 'random') {
    const color =
      colorPreference === 'random'
        ? Math.random() < 0.5
          ? 'white'
          : 'black'
        : colorPreference;

    const whiteId = color === 'white' ? userId : 'bot';
    const blackId = color === 'black' ? userId : 'bot';

    return this.gamesService.createGame(
      whiteId === 'bot' ? userId : whiteId,
      blackId === 'bot' ? userId : blackId,
      timeControlKey,
      true,
      difficulty,
    );
  }
}
