import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GamesService } from './games.service';
import { PrismaService } from '../../database/prisma.service';
import { GameStateService } from './game-state.service';
import { RatingsService } from '../ratings/ratings.service';

describe('GamesService', () => {
  let service: GamesService;

  const prisma = {
    game: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    gameMove: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const gameStateService = {
    initGame: jest.fn(),
    deleteGameState: jest.fn(),
  };

  const ratingsService = {
    getRatingForUser: jest.fn(),
    updateRatingsAfterGame: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: prisma },
        { provide: GameStateService, useValue: gameStateService },
        { provide: RatingsService, useValue: ratingsService },
      ],
    }).compile();

    service = moduleRef.get(GamesService);
  });

  describe('createGame', () => {
    it('rejects unknown time control keys', async () => {
      await expect(service.createGame('w', 'b', 'nonsense_9_9')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.game.create).not.toHaveBeenCalled();
    });

    it('creates a human game with time control config and both ratings snapshot', async () => {
      ratingsService.getRatingForUser
        .mockResolvedValueOnce({ rating: 1500 })
        .mockResolvedValueOnce({ rating: 1450 });
      prisma.game.create.mockResolvedValue({ id: 'g1' });

      const game = await service.createGame('white-id', 'black-id', 'blitz_5_3');

      expect(prisma.game.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          whiteId: 'white-id',
          blackId: 'black-id',
          timeControl: 'blitz',
          initialTimeMs: 300_000,
          incrementMs: 3_000,
          status: 'active',
          isBotGame: false,
          botDifficulty: null,
          whiteRatingBefore: 1500,
          blackRatingBefore: 1450,
        }),
      });
      expect(gameStateService.initGame).toHaveBeenCalledWith('g1', 300_000);
      expect(game).toEqual({ id: 'g1' });
    });

    it('creates a bot game with null blackId and no black rating lookup', async () => {
      ratingsService.getRatingForUser.mockResolvedValueOnce({ rating: 1300 });
      prisma.game.create.mockResolvedValue({ id: 'g2' });

      await service.createGame('user-id', 'user-id', 'rapid_10_0', true, 'hard');

      expect(ratingsService.getRatingForUser).toHaveBeenCalledTimes(1);
      expect(prisma.game.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          whiteId: 'user-id',
          blackId: null,
          isBotGame: true,
          botDifficulty: 'hard',
          whiteRatingBefore: 1300,
          blackRatingBefore: null,
        }),
      });
    });

    it('stores null rating snapshots for unrated players', async () => {
      ratingsService.getRatingForUser.mockResolvedValue(null);
      prisma.game.create.mockResolvedValue({ id: 'g3' });

      await service.createGame('w', 'b', 'bullet_1_0');

      expect(prisma.game.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          whiteRatingBefore: null,
          blackRatingBefore: null,
        }),
      });
    });
  });

  describe('getGameCore', () => {
    it('throws NotFoundException for a missing game', async () => {
      prisma.game.findUnique.mockResolvedValue(null);
      await expect(service.getGameCore('missing')).rejects.toThrow(NotFoundException);
    });

    it('selects only the trimmed scalar shape plus move count, never the move list', async () => {
      prisma.game.findUnique.mockResolvedValue({ id: 'g1' });

      await service.getGameCore('g1');

      const arg = prisma.game.findUnique.mock.calls[0][0];
      expect(arg.where).toEqual({ id: 'g1' });
      expect(Object.keys(arg.select).sort()).toEqual(
        [
          '_count',
          'black',
          'blackId',
          'blackRatingBefore',
          'botDifficulty',
          'id',
          'incrementMs',
          'initialTimeMs',
          'isBotGame',
          'pgn',
          'result',
          'status',
          'termination',
          'timeControl',
          'white',
          'whiteId',
          'whiteRatingBefore',
        ].sort(),
      );
      expect(arg.select._count).toEqual({ select: { moves: true } });
      expect(arg.select.moves).toBeUndefined();
      expect(arg.include).toBeUndefined();
    });
  });

  describe('getUserGames', () => {
    it('paginates ended games for the user on either color', async () => {
      prisma.game.findMany.mockResolvedValue([{ id: 'g1' }]);
      prisma.game.count.mockResolvedValue(41);

      const result = await service.getUserGames('u1', 2, 20);

      expect(prisma.game.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ whiteId: 'u1' }, { blackId: 'u1' }], status: 'ended' },
          skip: 20,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual({
        games: [{ id: 'g1' }],
        total: 41,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });
  });

  describe('endGame', () => {
    const activeRatedGame = {
      id: 'g1',
      status: 'active',
      isBotGame: false,
      whiteId: 'w1',
      blackId: 'b1',
      timeControl: 'blitz',
    };

    it('returns null deltas and does nothing when the game does not exist', async () => {
      prisma.game.findUnique.mockResolvedValue(null);

      const result = await service.endGame('gx', 'white', 'checkmate');

      expect(result).toEqual({ whiteDelta: null, blackDelta: null });
      expect(prisma.game.update).not.toHaveBeenCalled();
      expect(gameStateService.deleteGameState).not.toHaveBeenCalled();
    });

    it('returns null deltas when the game is already ended (idempotent)', async () => {
      prisma.game.findUnique.mockResolvedValue({ ...activeRatedGame, status: 'ended' });

      const result = await service.endGame('g1', 'white', 'resignation');

      expect(result).toEqual({ whiteDelta: null, blackDelta: null });
      expect(prisma.game.update).not.toHaveBeenCalled();
    });

    it('transitions active to ended, rebuilds pgn from moves, and updates ratings', async () => {
      prisma.game.findUnique.mockResolvedValue(activeRatedGame);
      prisma.gameMove.findMany.mockResolvedValue([
        { san: 'f3' },
        { san: 'e5' },
        { san: 'g4' },
        { san: 'Qh4#' },
      ]);
      ratingsService.updateRatingsAfterGame.mockResolvedValue({ whiteDelta: -12, blackDelta: 11 });

      const result = await service.endGame('g1', 'black', 'checkmate');

      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: expect.objectContaining({
          status: 'ended',
          result: 'black',
          termination: 'checkmate',
          pgn: expect.stringContaining('Qh4#'),
          endedAt: expect.any(Date),
        }),
      });
      expect(ratingsService.updateRatingsAfterGame).toHaveBeenCalledWith(
        'g1',
        'w1',
        'b1',
        'black',
        'blitz',
      );
      expect(gameStateService.deleteGameState).toHaveBeenCalledWith('g1');
      expect(result).toEqual({ whiteDelta: -12, blackDelta: 11 });
    });

    it('skips rating updates for bot games', async () => {
      prisma.game.findUnique.mockResolvedValue({
        ...activeRatedGame,
        isBotGame: true,
        blackId: null,
      });
      prisma.gameMove.findMany.mockResolvedValue([]);

      const result = await service.endGame('g1', 'white', 'resignation');

      expect(ratingsService.updateRatingsAfterGame).not.toHaveBeenCalled();
      expect(result).toEqual({ whiteDelta: null, blackDelta: null });
      expect(gameStateService.deleteGameState).toHaveBeenCalledWith('g1');
    });

    it('skips rating updates for abandoned results', async () => {
      prisma.game.findUnique.mockResolvedValue(activeRatedGame);
      prisma.gameMove.findMany.mockResolvedValue([]);

      const result = await service.endGame('g1', 'abandoned', 'abandoned');

      expect(ratingsService.updateRatingsAfterGame).not.toHaveBeenCalled();
      expect(result).toEqual({ whiteDelta: null, blackDelta: null });
    });
  });

  describe('recordMove', () => {
    it('persists the move exactly as provided', async () => {
      prisma.gameMove.create.mockResolvedValue({ id: 'm1' });

      await service.recordMove('g1', 3, 'white', 'Nf3', 'g1f3', 'fen-after', 295_000);

      expect(prisma.gameMove.create).toHaveBeenCalledWith({
        data: {
          gameId: 'g1',
          moveNumber: 3,
          color: 'white',
          san: 'Nf3',
          uci: 'g1f3',
          fenAfter: 'fen-after',
          timeLeftMs: 295_000,
        },
      });
    });
  });

  describe('abandonGame', () => {
    it('marks the game abandoned and clears cached state', async () => {
      prisma.game.update.mockResolvedValue({});

      await service.abandonGame('g1');

      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: expect.objectContaining({
          status: 'abandoned',
          result: 'abandoned',
          termination: 'abandoned',
        }),
      });
      expect(gameStateService.deleteGameState).toHaveBeenCalledWith('g1');
    });
  });
});
