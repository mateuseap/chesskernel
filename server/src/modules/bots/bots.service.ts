import { Injectable, Logger } from '@nestjs/common';
import { Chess } from 'chess.js';
import { StockfishService } from '../analysis/stockfish.service';
import { GameStateService } from '../games/game-state.service';
import { GamesService } from '../games/games.service';
import type { BotDifficulty } from '@chesskernel/shared';

interface DifficultyConfig {
  skillLevel: number;
  depth?: number;
  moveTimeMs: number;
}

const DIFFICULTY_CONFIGS: Record<BotDifficulty, DifficultyConfig> = {
  beginner: { skillLevel: 0, depth: 1, moveTimeMs: 100 },
  easy: { skillLevel: 5, depth: 3, moveTimeMs: 200 },
  medium: { skillLevel: 10, depth: 5, moveTimeMs: 500 },
  hard: { skillLevel: 15, depth: 10, moveTimeMs: 1000 },
  expert: { skillLevel: 18, depth: 15, moveTimeMs: 2000 },
  maximum: { skillLevel: 20, moveTimeMs: 3000 },
};

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);

  constructor(
    private readonly stockfish: StockfishService,
    private readonly gameState: GameStateService,
    private readonly gamesService: GamesService,
  ) {}

  async makeBotMove(
    gameId: string,
    botColor: 'white' | 'black',
    difficulty: BotDifficulty,
    incrementMs: number,
  ): Promise<{ san: string; uci: string; fen: string } | null> {
    const state = await this.gameState.getState(gameId);
    if (!state || state.activeColor !== botColor) return null;

    const config = DIFFICULTY_CONFIGS[difficulty];
    const chess = new Chess(state.fen);

    if (chess.isGameOver()) return null;

    try {
      const bestMove = await this.stockfish.getBestMove(
        state.fen,
        config.skillLevel,
        config.moveTimeMs,
        config.depth,
      );

      if (!bestMove || bestMove === '(none)') return null;

      const from = bestMove.substring(0, 2);
      const to = bestMove.substring(2, 4);
      const promotion = bestMove.length === 5 ? bestMove[4] : undefined;

      const result = await this.gameState.applyMove(gameId, from, to, promotion, incrementMs);
      if (!result) return null;

      const game = await this.gamesService.getGame(gameId);
      const moveCount = game.moves.length + 1;
      const timeLeftMs = botColor === 'white' ? result.clock.white : result.clock.black;

      await this.gamesService.recordMove(
        gameId,
        Math.ceil(moveCount / 2),
        botColor,
        result.san,
        result.uci,
        result.newFen,
        timeLeftMs,
      );

      return { san: result.san, uci: result.uci, fen: result.newFen };
    } catch (err) {
      this.logger.error(`Bot move failed for game ${gameId}: ${(err as Error).message}`);
      return null;
    }
  }
}
