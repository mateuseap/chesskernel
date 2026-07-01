import { Injectable } from '@nestjs/common';
import { TimeControl } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';

const LEADERBOARD_CACHE_TTL = 300;

@Injectable()
export class LeaderboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getLeaderboard(timeControl: TimeControl, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.userRating.findMany({
        where: { timeControl, gamesPlayed: { gte: 5 } },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, country: true },
          },
        },
        orderBy: { rating: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userRating.count({
        where: { timeControl, gamesPlayed: { gte: 5 } },
      }),
    ]);

    const ranked = entries.map((entry, index) => ({
      rank: skip + index + 1,
      user: entry.user,
      rating: entry.rating,
      ratingDeviation: entry.ratingDeviation,
      gamesPlayed: entry.gamesPlayed,
    }));

    return { entries: ranked, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserRank(userId: string, timeControl: TimeControl): Promise<number | null> {
    const userRating = await this.prisma.userRating.findUnique({
      where: { userId_timeControl: { userId, timeControl } },
    });
    if (!userRating || userRating.gamesPlayed < 5) return null;

    const rank = await this.prisma.userRating.count({
      where: {
        timeControl,
        gamesPlayed: { gte: 5 },
        rating: { gt: userRating.rating },
      },
    });

    return rank + 1;
  }
}
