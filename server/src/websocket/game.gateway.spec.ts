import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { GameGateway } from './game.gateway';
import { GamesService } from '../modules/games/games.service';
import { GameStateService } from '../modules/games/game-state.service';
import { ClockService } from '../modules/games/clock.service';
import { MatchmakingService } from '../modules/matchmaking/matchmaking.service';
import { BotsService } from '../modules/bots/bots.service';
import { PresenceService } from '../websocket/presence.service';

const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPPPPPP/RNBQKBNR b KQkq e3 0 1';
const FEN_FOOLS_MATE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';

describe('GameGateway', () => {
  let gateway: GameGateway;

  const gamesService = {
    getGameCore: jest.fn(),
    recordMove: jest.fn(),
    endGame: jest.fn(),
  };
  const gameStateService = {
    getState: jest.fn(),
    applyMove: jest.fn(),
    setDrawOffer: jest.fn(),
    clearDrawOffer: jest.fn(),
  };
  const clockService = {
    scheduleTimeout: jest.fn(),
    cancelTimeout: jest.fn(),
  };
  const matchmakingService = { joinQueue: jest.fn(), leaveQueue: jest.fn() };
  const botsService = { makeBotMove: jest.fn() };
  const presenceService = {
    registerSocket: jest.fn(),
    removeSocket: jest.fn(),
    heartbeat: jest.fn(),
  };

  const roomEmit = jest.fn();
  const socketsJoin = jest.fn();
  const server = {
    to: jest.fn().mockReturnValue({ emit: roomEmit, socketsJoin }),
  };

  const activeGame = {
    id: 'g1',
    status: 'active',
    result: null,
    termination: null,
    pgn: null,
    whiteId: 'w1',
    blackId: 'b1',
    timeControl: 'blitz',
    initialTimeMs: 300_000,
    incrementMs: 0,
    isBotGame: false,
    botDifficulty: null,
    whiteRatingBefore: 1500,
    blackRatingBefore: 1480,
    white: { id: 'w1', username: 'whitey', avatarUrl: null },
    black: { id: 'b1', username: 'blacky', avatarUrl: null },
    _count: { moves: 0 },
  };

  function createSocket(userId: string): Socket {
    return {
      data: { userId, username: `user-${userId}` },
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    } as unknown as Socket;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    server.to.mockReturnValue({ emit: roomEmit, socketsJoin });
    gamesService.endGame.mockResolvedValue({ whiteDelta: 8, blackDelta: -8 });

    gateway = new GameGateway(
      {} as JwtService,
      gamesService as unknown as GamesService,
      gameStateService as unknown as GameStateService,
      clockService as unknown as ClockService,
      matchmakingService as unknown as MatchmakingService,
      botsService as unknown as BotsService,
      presenceService as unknown as PresenceService,
    );
    gateway.server = server as unknown as Server;
  });

  describe('handleMove', () => {
    it('rejects moves when the game is not active', async () => {
      const socket = createSocket('w1');
      gamesService.getGameCore.mockResolvedValue({ ...activeGame, status: 'ended' });

      await gateway.handleMove(socket, { gameId: 'g1', from: 'e2', to: 'e4' });

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'GAME_NOT_ACTIVE',
        message: 'Game is not active',
      });
      expect(gamesService.recordMove).not.toHaveBeenCalled();
    });

    it('rejects moves from users who are not players in the game', async () => {
      const socket = createSocket('intruder');
      gamesService.getGameCore.mockResolvedValue(activeGame);

      await gateway.handleMove(socket, { gameId: 'g1', from: 'e2', to: 'e4' });

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_PLAYER',
        message: 'You are not a player in this game',
      });
      expect(gameStateService.applyMove).not.toHaveBeenCalled();
    });

    it('rejects moves out of turn', async () => {
      const socket = createSocket('b1');
      gamesService.getGameCore.mockResolvedValue(activeGame);
      gameStateService.getState.mockResolvedValue({ activeColor: 'white' });

      await gateway.handleMove(socket, { gameId: 'g1', from: 'e7', to: 'e5' });

      expect(socket.emit).toHaveBeenCalledWith('game:move:rejected', {
        reason: 'Not your turn',
        from: 'e7',
        to: 'e5',
      });
      expect(gameStateService.applyMove).not.toHaveBeenCalled();
    });

    it('rejects illegal moves reported by the state service', async () => {
      const socket = createSocket('w1');
      gamesService.getGameCore.mockResolvedValue(activeGame);
      gameStateService.getState.mockResolvedValue({ activeColor: 'white' });
      gameStateService.applyMove.mockResolvedValue(null);

      await gateway.handleMove(socket, { gameId: 'g1', from: 'e2', to: 'e5' });

      expect(socket.emit).toHaveBeenCalledWith('game:move:rejected', {
        reason: 'Illegal move',
        from: 'e2',
        to: 'e5',
      });
      expect(gamesService.recordMove).not.toHaveBeenCalled();
    });

    it('records a legal move, broadcasts it, and schedules the opponent clock', async () => {
      const socket = createSocket('w1');
      gamesService.getGameCore.mockResolvedValue(activeGame);
      gameStateService.getState.mockResolvedValue({ activeColor: 'white' });
      gameStateService.applyMove.mockResolvedValue({
        san: 'e4',
        uci: 'e2e4',
        newFen: FEN_AFTER_E4,
        clock: { white: 299_000, black: 300_000, activeColor: 'black', lastUpdatedAt: 1 },
      });

      await gateway.handleMove(socket, { gameId: 'g1', from: 'e2', to: 'e4' });

      expect(gamesService.recordMove).toHaveBeenCalledWith(
        'g1',
        1,
        'white',
        'e4',
        'e2e4',
        FEN_AFTER_E4,
        299_000,
      );
      expect(server.to).toHaveBeenCalledWith('game:g1');
      expect(roomEmit).toHaveBeenCalledWith(
        'game:move:broadcast',
        expect.objectContaining({
          fen: FEN_AFTER_E4,
          isCheck: false,
          isCheckmate: false,
          isStalemate: false,
          isDraw: false,
          move: expect.objectContaining({ moveNumber: 1, color: 'white', san: 'e4' }),
        }),
      );
      expect(clockService.scheduleTimeout).toHaveBeenCalledWith(
        'g1',
        'black',
        300_000,
        expect.any(Function),
      );
      expect(gamesService.endGame).not.toHaveBeenCalled();
    });

    it('ends the game with the mover as winner when the move is checkmate', async () => {
      const socket = createSocket('b1');
      gamesService.getGameCore.mockResolvedValue(activeGame);
      gameStateService.getState.mockResolvedValue({ activeColor: 'black' });
      gameStateService.applyMove.mockResolvedValue({
        san: 'Qh4#',
        uci: 'd8h4',
        newFen: FEN_FOOLS_MATE,
        clock: { white: 290_000, black: 295_000, activeColor: 'white', lastUpdatedAt: 1 },
      });

      await gateway.handleMove(socket, { gameId: 'g1', from: 'd8', to: 'h4' });

      expect(gamesService.endGame).toHaveBeenCalledWith('g1', 'black', 'checkmate');
      expect(clockService.cancelTimeout).toHaveBeenCalledWith('g1');
      expect(roomEmit).toHaveBeenCalledWith(
        'game:over',
        expect.objectContaining({
          result: 'black',
          termination: 'checkmate',
          winner: 'black',
          whiteRatingDelta: 8,
          blackRatingDelta: -8,
        }),
      );
      expect(clockService.scheduleTimeout).not.toHaveBeenCalled();
    });
  });

  describe('handleResign', () => {
    it('awards the win to the opponent of the resigning player', async () => {
      const socket = createSocket('w1');
      gamesService.getGameCore.mockResolvedValue(activeGame);

      await gateway.handleResign(socket, { gameId: 'g1' });

      expect(gamesService.endGame).toHaveBeenCalledWith('g1', 'black', 'resignation');
      expect(roomEmit).toHaveBeenCalledWith(
        'game:over',
        expect.objectContaining({ result: 'black', termination: 'resignation' }),
      );
    });

    it('ignores resignations from non-players', async () => {
      const socket = createSocket('spectator');
      gamesService.getGameCore.mockResolvedValue(activeGame);

      await gateway.handleResign(socket, { gameId: 'g1' });

      expect(gamesService.endGame).not.toHaveBeenCalled();
    });

    it('ignores resignations for games that already ended', async () => {
      const socket = createSocket('w1');
      gamesService.getGameCore.mockResolvedValue({ ...activeGame, status: 'ended' });

      await gateway.handleResign(socket, { gameId: 'g1' });

      expect(gamesService.endGame).not.toHaveBeenCalled();
    });
  });

  describe('draw handling', () => {
    it('stores the draw offer and notifies the game room', async () => {
      const socket = createSocket('b1');
      gamesService.getGameCore.mockResolvedValue(activeGame);

      await gateway.handleDrawOffer(socket, { gameId: 'g1' });

      expect(gameStateService.setDrawOffer).toHaveBeenCalledWith('g1', 'black');
      expect(roomEmit).toHaveBeenCalledWith('game:draw:offered', { byColor: 'black' });
    });

    it('accepting a pending offer ends the game as a draw by agreement', async () => {
      const socket = createSocket('w1');
      gameStateService.getState.mockResolvedValue({ drawOffer: 'black' });
      gamesService.getGameCore.mockResolvedValue(activeGame);
      gamesService.endGame.mockResolvedValue({ whiteDelta: 0, blackDelta: 0 });

      await gateway.handleDrawAccept(socket, { gameId: 'g1' });

      expect(gamesService.endGame).toHaveBeenCalledWith('g1', 'draw', 'draw_agreement');
      expect(roomEmit).toHaveBeenCalledWith(
        'game:over',
        expect.objectContaining({ result: 'draw', winner: null, termination: 'draw_agreement' }),
      );
    });

    it('accepting with no pending offer does nothing', async () => {
      const socket = createSocket('w1');
      gameStateService.getState.mockResolvedValue({ drawOffer: null });

      await gateway.handleDrawAccept(socket, { gameId: 'g1' });

      expect(gamesService.endGame).not.toHaveBeenCalled();
    });

    it('declining clears the offer and notifies the room', async () => {
      const socket = createSocket('w1');

      await gateway.handleDrawDecline(socket, { gameId: 'g1' });

      expect(gameStateService.clearDrawOffer).toHaveBeenCalledWith('g1');
      expect(roomEmit).toHaveBeenCalledWith('game:draw:declined');
    });
  });

  describe('handleSpectate', () => {
    it('replays the stored result when joining an already ended game', async () => {
      const socket = createSocket('viewer');
      gamesService.getGameCore.mockResolvedValue({
        ...activeGame,
        status: 'ended',
        result: 'white',
        termination: 'timeout',
        pgn: '1. e4 e5',
      });

      await gateway.handleSpectate(socket, { gameId: 'g1' });

      expect(socket.join).toHaveBeenCalledWith('game:g1');
      expect(socket.emit).toHaveBeenCalledWith('game:over', {
        result: 'white',
        termination: 'timeout',
        winner: 'white',
        pgn: '1. e4 e5',
        whiteRatingDelta: 0,
        blackRatingDelta: 0,
      });
    });

    it('sends the live clock when joining an active game', async () => {
      const socket = createSocket('viewer');
      gamesService.getGameCore.mockResolvedValue(activeGame);
      gameStateService.getState.mockResolvedValue({
        whiteTimeMs: 250_000,
        blackTimeMs: 260_000,
        activeColor: 'white',
        lastMoveAt: 42,
      });

      await gateway.handleSpectate(socket, { gameId: 'g1' });

      expect(socket.emit).toHaveBeenCalledWith('game:clock', {
        white: 250_000,
        black: 260_000,
        activeColor: 'white',
        lastUpdatedAt: 42,
      });
    });
  });

  describe('queue handlers', () => {
    it('notifies both players with their color and opponent info on a match', async () => {
      const socket = createSocket('w1');
      matchmakingService.joinQueue.mockResolvedValue({
        gameId: 'g1',
        whiteId: 'w1',
        blackId: 'b1',
      });
      gamesService.getGameCore.mockResolvedValue(activeGame);

      await gateway.handleQueueJoin(socket, { timeControlKey: 'blitz_5_0' });

      expect(roomEmit).toHaveBeenCalledWith('queue:matched', {
        gameId: 'g1',
        color: 'white',
        opponentUsername: 'blacky',
        opponentRating: 1480,
      });
      expect(roomEmit).toHaveBeenCalledWith('queue:matched', {
        gameId: 'g1',
        color: 'black',
        opponentUsername: 'whitey',
        opponentRating: 1500,
      });
      expect(clockService.scheduleTimeout).toHaveBeenCalledWith(
        'g1',
        'white',
        300_000,
        expect.any(Function),
      );
    });

    it('does nothing beyond queueing when no match is found', async () => {
      const socket = createSocket('w1');
      matchmakingService.joinQueue.mockResolvedValue(null);

      await gateway.handleQueueJoin(socket, { timeControlKey: 'blitz_5_0' });

      expect(roomEmit).not.toHaveBeenCalled();
      expect(clockService.scheduleTimeout).not.toHaveBeenCalled();
    });

    it('queue:leave removes the user from matchmaking', async () => {
      const socket = createSocket('w1');

      await gateway.handleQueueLeave(socket);

      expect(matchmakingService.leaveQueue).toHaveBeenCalledWith('w1');
    });
  });
});
