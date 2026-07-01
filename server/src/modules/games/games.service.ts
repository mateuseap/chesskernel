import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Chess } from 'chess.js';
import { TimeControl, GameStatus, GameResult, GameTermination } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GameStateService } from './game-state.service';
import { RatingsService } from '../ratings/ratings.service';
import { TIME_CONTROLS } from '@chesskernel/shared';

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameStateService: GameStateService,
    private readonly ratingsService: RatingsService,
  ) {}

  async createGame(
    whiteId: string,
    blackId: string,
    timeControlKey: string,
    isBotGame = false,
    botDifficulty?: string,
  ) {
    const tc = TIME_CONTROLS[timeControlKey];
    if (!tc) throw new BadRequestException(`Unknown time control: ${timeControlKey}`);

    const [whiteRating, blackRating] = await Promise.all([
      this.ratingsService.getRatingForUser(whiteId, tc.type as TimeControl),
      isBotGame ? null : this.ratingsService.getRatingForUser(blackId, tc.type as TimeControl),
    ]);

    const game = await this.prisma.game.create({
      data: {
        whiteId,
        blackId: isBotGame ? null : blackId,
        timeControl: tc.type as TimeControl,
        initialTimeMs: tc.initialTimeMs,
        incrementMs: tc.incrementMs,
        status: 'active',
        isBotGame,
        botDifficulty: botDifficulty ?? null,
        whiteRatingBefore: whiteRating?.rating ?? null,
        blackRatingBefore: isBotGame ? null : (blackRating?.rating ?? null),
        startedAt: new Date(),
      },
    });

    await this.gameStateService.initGame(game.id, tc.initialTimeMs);

    return game;
  }

  async getGame(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        white: { select: { id: true, username: true, avatarUrl: true } },
        black: { select: { id: true, username: true, avatarUrl: true } },
        moves: { orderBy: { moveNumber: 'asc' } },
        analysis: true,
      },
    });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    return game;
  }

  async getUserGames(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [games, total] = await Promise.all([
      this.prisma.game.findMany({
        where: {
          OR: [{ whiteId: userId }, { blackId: userId }],
          status: 'ended',
        },
        include: {
          white: { select: { id: true, username: true, avatarUrl: true } },
          black: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { moves: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.game.count({
        where: {
          OR: [{ whiteId: userId }, { blackId: userId }],
          status: 'ended',
        },
      }),
    ]);

    return { games, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async endGame(
    gameId: string,
    result: GameResult,
    termination: GameTermination,
  ): Promise<{ whiteDelta: number | null; blackDelta: number | null }> {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.status !== 'active') return { whiteDelta: null, blackDelta: null };

    const chess = new Chess();
    const moves = await this.prisma.gameMove.findMany({
      where: { gameId },
      orderBy: { moveNumber: 'asc' },
    });
    for (const m of moves) {
      chess.move(m.san);
    }
    const pgn = chess.pgn();

    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: 'ended', result, termination, pgn, endedAt: new Date() },
    });

    let whiteDelta: number | null = null;
    let blackDelta: number | null = null;

    if (!game.isBotGame && game.whiteId && game.blackId && result !== 'abandoned') {
      const deltas = await this.ratingsService.updateRatingsAfterGame(
        gameId,
        game.whiteId,
        game.blackId,
        result as 'white' | 'black' | 'draw',
        game.timeControl,
      );
      whiteDelta = deltas.whiteDelta;
      blackDelta = deltas.blackDelta;
    }

    await this.gameStateService.deleteGameState(gameId);

    return { whiteDelta, blackDelta };
  }

  async recordMove(
    gameId: string,
    moveNumber: number,
    color: 'white' | 'black',
    san: string,
    uci: string,
    fenAfter: string,
    timeLeftMs: number,
  ) {
    return this.prisma.gameMove.create({
      data: {
        gameId,
        moveNumber,
        color,
        san,
        uci,
        fenAfter,
        timeLeftMs,
      },
    });
  }

  async abandonGame(gameId: string): Promise<void> {
    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: 'abandoned', result: 'abandoned', termination: 'abandoned', endedAt: new Date() },
    });
    await this.gameStateService.deleteGameState(gameId);
  }
}
