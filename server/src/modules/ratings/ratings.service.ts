import { Injectable } from '@nestjs/common';
import { TimeControl } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { calculateNewRating } from './glicko2';
import type { GameResult } from '@chesskernel/shared';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRatingForUser(userId: string, timeControl: TimeControl) {
    return this.prisma.userRating.findUnique({
      where: { userId_timeControl: { userId, timeControl } },
    });
  }

  async updateRatingsAfterGame(
    gameId: string,
    whiteId: string,
    blackId: string,
    result: GameResult,
    timeControl: TimeControl,
  ): Promise<{ whiteDelta: number; blackDelta: number }> {
    const [whiteRating, blackRating] = await Promise.all([
      this.getRatingForUser(whiteId, timeControl),
      this.getRatingForUser(blackId, timeControl),
    ]);

    if (!whiteRating || !blackRating) {
      throw new Error(`Missing rating records for game ${gameId}`);
    }

    const whiteScore = result === 'white' ? 1 : result === 'draw' ? 0.5 : 0;
    const blackScore = 1 - whiteScore;

    const newWhite = calculateNewRating(
      { rating: whiteRating.rating, ratingDeviation: whiteRating.ratingDeviation, volatility: whiteRating.volatility },
      [{ opponentRating: blackRating.rating, opponentRd: blackRating.ratingDeviation, score: whiteScore as 0 | 0.5 | 1 }],
    );

    const newBlack = calculateNewRating(
      { rating: blackRating.rating, ratingDeviation: blackRating.ratingDeviation, volatility: blackRating.volatility },
      [{ opponentRating: whiteRating.rating, opponentRd: whiteRating.ratingDeviation, score: blackScore as 0 | 0.5 | 1 }],
    );

    const whiteDelta = newWhite.rating - whiteRating.rating;
    const blackDelta = newBlack.rating - blackRating.rating;

    await this.prisma.$transaction([
      this.prisma.userRating.update({
        where: { userId_timeControl: { userId: whiteId, timeControl } },
        data: {
          rating: newWhite.rating,
          ratingDeviation: newWhite.ratingDeviation,
          volatility: newWhite.volatility,
          gamesPlayed: { increment: 1 },
        },
      }),
      this.prisma.userRating.update({
        where: { userId_timeControl: { userId: blackId, timeControl } },
        data: {
          rating: newBlack.rating,
          ratingDeviation: newBlack.ratingDeviation,
          volatility: newBlack.volatility,
          gamesPlayed: { increment: 1 },
        },
      }),
      this.prisma.game.update({
        where: { id: gameId },
        data: {
          whiteRatingBefore: whiteRating.rating,
          blackRatingBefore: blackRating.rating,
          whiteRatingDelta: whiteDelta,
          blackRatingDelta: blackDelta,
        },
      }),
    ]);

    return { whiteDelta, blackDelta };
  }
}
