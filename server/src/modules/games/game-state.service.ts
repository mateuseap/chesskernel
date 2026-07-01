import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';
import { RedisService } from '../../database/redis.service';
import type { GameClock } from '@chesskernel/shared';

const GAME_STATE_TTL = 7200;

interface CachedGameState {
  fen: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  activeColor: 'white' | 'black';
  lastMoveAt: number;
  drawOffer: 'white' | 'black' | null;
}

@Injectable()
export class GameStateService {
  constructor(private readonly redis: RedisService) {}

  async initGame(
    gameId: string,
    initialTimeMs: number,
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ): Promise<void> {
    const state: Record<string, string | number> = {
      fen,
      whiteTimeMs: initialTimeMs,
      blackTimeMs: initialTimeMs,
      activeColor: 'white',
      lastMoveAt: Date.now(),
      drawOffer: '',
    };
    await this.redis.hmset(`game:${gameId}:state`, state);
    await this.redis.expire(`game:${gameId}:state`, GAME_STATE_TTL);
  }

  async getState(gameId: string): Promise<CachedGameState | null> {
    const raw = await this.redis.hgetall(`game:${gameId}:state`);
    if (!raw || !raw.fen) return null;

    return {
      fen: raw.fen,
      whiteTimeMs: parseInt(raw.whiteTimeMs, 10),
      blackTimeMs: parseInt(raw.blackTimeMs, 10),
      activeColor: raw.activeColor as 'white' | 'black',
      lastMoveAt: parseInt(raw.lastMoveAt, 10),
      drawOffer: (raw.drawOffer || null) as 'white' | 'black' | null,
    };
  }

  async applyMove(
    gameId: string,
    from: string,
    to: string,
    promotion: string | undefined,
    incrementMs: number,
  ): Promise<{ san: string; uci: string; newFen: string; clock: GameClock } | null> {
    const state = await this.getState(gameId);
    if (!state) return null;

    const chess = new Chess(state.fen);
    const moveResult = chess.move({ from, to, promotion });
    if (!moveResult) return null;

    const now = Date.now();
    const elapsed = now - state.lastMoveAt;
    const activeColor = state.activeColor;

    let newWhiteMs = state.whiteTimeMs;
    let newBlackMs = state.blackTimeMs;

    if (activeColor === 'white') {
      newWhiteMs = Math.max(0, state.whiteTimeMs - elapsed + incrementMs);
    } else {
      newBlackMs = Math.max(0, state.blackTimeMs - elapsed + incrementMs);
    }

    const nextColor = activeColor === 'white' ? 'black' : 'white';

    const updatedState: Record<string, string | number> = {
      fen: chess.fen(),
      whiteTimeMs: newWhiteMs,
      blackTimeMs: newBlackMs,
      activeColor: nextColor,
      lastMoveAt: now,
      drawOffer: '',
    };

    await this.redis.hmset(`game:${gameId}:state`, updatedState);
    await this.redis.expire(`game:${gameId}:state`, GAME_STATE_TTL);

    const uci = `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ''}`;

    return {
      san: moveResult.san,
      uci,
      newFen: chess.fen(),
      clock: {
        white: newWhiteMs,
        black: newBlackMs,
        activeColor: nextColor,
        lastUpdatedAt: now,
      },
    };
  }

  async setDrawOffer(gameId: string, color: 'white' | 'black'): Promise<void> {
    await this.redis.hset(`game:${gameId}:state`, 'drawOffer', color);
  }

  async clearDrawOffer(gameId: string): Promise<void> {
    await this.redis.hset(`game:${gameId}:state`, 'drawOffer', '');
  }

  async getRemainingTime(gameId: string): Promise<GameClock | null> {
    const state = await this.getState(gameId);
    if (!state) return null;

    const now = Date.now();
    const elapsed = now - state.lastMoveAt;

    let whiteMs = state.whiteTimeMs;
    let blackMs = state.blackTimeMs;

    if (state.activeColor === 'white') {
      whiteMs = Math.max(0, state.whiteTimeMs - elapsed);
    } else {
      blackMs = Math.max(0, state.blackTimeMs - elapsed);
    }

    return {
      white: whiteMs,
      black: blackMs,
      activeColor: state.activeColor,
      lastUpdatedAt: state.lastMoveAt,
    };
  }

  async deleteGameState(gameId: string): Promise<void> {
    await this.redis.del(`game:${gameId}:state`);
  }
}
