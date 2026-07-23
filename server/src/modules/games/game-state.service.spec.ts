import { GameStateService } from './game-state.service';
import { RedisService } from '../../database/redis.service';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Minimal in-memory stand-in for the RedisService hash commands used here. */
function createFakeRedis() {
  const hashes = new Map<string, Record<string, string>>();
  return {
    hashes,
    hmset: jest.fn(async (key: string, data: Record<string, string | number>) => {
      const existing = hashes.get(key) ?? {};
      const next: Record<string, string> = { ...existing };
      for (const [field, value] of Object.entries(data)) next[field] = String(value);
      hashes.set(key, next);
    }),
    hset: jest.fn(async (key: string, field: string, value: string) => {
      const existing = hashes.get(key) ?? {};
      hashes.set(key, { ...existing, [field]: value });
    }),
    hgetall: jest.fn(async (key: string) => hashes.get(key) ?? {}),
    expire: jest.fn(async () => undefined),
    del: jest.fn(async (...keys: string[]) => {
      for (const key of keys) hashes.delete(key);
    }),
  };
}

describe('GameStateService', () => {
  let redis: ReturnType<typeof createFakeRedis>;
  let service: GameStateService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    redis = createFakeRedis();
    service = new GameStateService(redis as unknown as RedisService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initGame stores starting position, equal clocks, white to move, no draw offer', async () => {
    await service.initGame('g1', 300_000);

    const state = await service.getState('g1');
    expect(state).toEqual({
      fen: START_FEN,
      whiteTimeMs: 300_000,
      blackTimeMs: 300_000,
      activeColor: 'white',
      lastMoveAt: Date.now(),
      drawOffer: null,
    });
    expect(redis.expire).toHaveBeenCalledWith('game:g1:state', 7200);
  });

  it('getState returns null when no state exists', async () => {
    expect(await service.getState('unknown')).toBeNull();
  });

  describe('applyMove', () => {
    it('returns null for a game with no cached state', async () => {
      expect(await service.applyMove('nope', 'e2', 'e4', undefined, 0)).toBeNull();
    });

    it('throws on an illegal move (chess.js v1 throws instead of returning null) and leaves state untouched', async () => {
      await service.initGame('g1', 300_000);

      await expect(service.applyMove('g1', 'e2', 'e5', undefined, 0)).rejects.toThrow(
        'Invalid move',
      );

      const state = await service.getState('g1');
      expect(state?.fen).toBe(START_FEN);
      expect(state?.activeColor).toBe('white');
    });

    it('applies a legal move: new fen, san, uci, turn passes to black', async () => {
      await service.initGame('g1', 300_000);
      jest.advanceTimersByTime(5_000);

      const result = await service.applyMove('g1', 'e2', 'e4', undefined, 0);

      expect(result).not.toBeNull();
      expect(result?.san).toBe('e4');
      expect(result?.uci).toBe('e2e4');
      expect(result?.newFen).toContain(' b KQkq ');
      expect(result?.clock.activeColor).toBe('black');

      const state = await service.getState('g1');
      expect(state?.fen).toBe(result?.newFen);
      expect(state?.activeColor).toBe('black');
    });

    it('charges elapsed time to the mover and adds the increment, opponent clock untouched', async () => {
      await service.initGame('g1', 300_000);
      jest.advanceTimersByTime(5_000);

      const result = await service.applyMove('g1', 'e2', 'e4', undefined, 3_000);

      expect(result?.clock.white).toBe(300_000 - 5_000 + 3_000);
      expect(result?.clock.black).toBe(300_000);
    });

    it('clamps the mover clock at zero instead of going negative', async () => {
      await service.initGame('g1', 10_000);
      jest.advanceTimersByTime(60_000);

      const result = await service.applyMove('g1', 'e2', 'e4', undefined, 0);

      expect(result?.clock.white).toBe(0);
    });

    it('includes the promotion piece in the uci string', async () => {
      const promotionFen = '8/P7/8/8/8/8/7k/K7 w - - 0 1';
      await service.initGame('g1', 60_000, promotionFen);

      const result = await service.applyMove('g1', 'a7', 'a8', 'q', 0);

      expect(result?.uci).toBe('a7a8q');
      expect(result?.san).toContain('=Q');
    });

    it('clears a pending draw offer when a move is played', async () => {
      await service.initGame('g1', 300_000);
      await service.setDrawOffer('g1', 'black');

      await service.applyMove('g1', 'e2', 'e4', undefined, 0);

      const state = await service.getState('g1');
      expect(state?.drawOffer).toBeNull();
    });
  });

  describe('draw offers', () => {
    it('setDrawOffer and clearDrawOffer round-trip through getState', async () => {
      await service.initGame('g1', 300_000);

      await service.setDrawOffer('g1', 'white');
      expect((await service.getState('g1'))?.drawOffer).toBe('white');

      await service.clearDrawOffer('g1');
      expect((await service.getState('g1'))?.drawOffer).toBeNull();
    });
  });

  describe('getRemainingTime', () => {
    it('returns null when no state exists', async () => {
      expect(await service.getRemainingTime('nope')).toBeNull();
    });

    it('counts down only the active color', async () => {
      await service.initGame('g1', 300_000);
      jest.advanceTimersByTime(20_000);

      const clock = await service.getRemainingTime('g1');

      expect(clock?.white).toBe(280_000);
      expect(clock?.black).toBe(300_000);
      expect(clock?.activeColor).toBe('white');
    });
  });

  it('deleteGameState removes the cached state', async () => {
    await service.initGame('g1', 300_000);
    await service.deleteGameState('g1');
    expect(await service.getState('g1')).toBeNull();
  });
});
