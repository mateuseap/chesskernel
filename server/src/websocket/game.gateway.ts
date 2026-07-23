import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { socketConnections } from '../metrics/metrics';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Chess } from 'chess.js';
import { GamesService } from '../modules/games/games.service';
import { GameStateService } from '../modules/games/game-state.service';
import { ClockService } from '../modules/games/clock.service';
import { MatchmakingService } from '../modules/matchmaking/matchmaking.service';
import { BotsService } from '../modules/bots/bots.service';
import { PresenceService } from './presence.service';
import type {
  GameMovePayload,
  GameIdPayload,
  QueueJoinPayload,
  BotDifficulty,
} from '@chesskernel/shared';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly gamesService: GamesService,
    private readonly gameStateService: GameStateService,
    private readonly clockService: ClockService,
    private readonly matchmakingService: MatchmakingService,
    private readonly botsService: BotsService,
    private readonly presenceService: PresenceService,
  ) {}

  async handleConnection(socket: Socket) {
    socketConnections.inc();
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string; username: string }>(token);
      socket.data.userId = payload.sub;
      socket.data.username = payload.username;
      await this.presenceService.registerSocket(socket.id, payload.sub);

      socket.join(`user:${payload.sub}`);
      this.logger.log(`User ${payload.username} connected (socket ${socket.id})`);
    } catch {
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket) {
    socketConnections.dec();
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;

    await this.presenceService.removeSocket(socket.id);
    this.logger.log(`User ${socket.data.username} disconnected`);
  }

  @SubscribeMessage('user:heartbeat')
  async handleHeartbeat(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId as string;
    await this.presenceService.heartbeat(userId);
  }

  @SubscribeMessage('game:spectate')
  async handleSpectate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: GameIdPayload,
  ) {
    socket.join(`game:${payload.gameId}`);

    // Check if game already ended (reconnect after refresh)
    const game = await this.gamesService.getGameCore(payload.gameId);
    if (game.status === 'ended') {
      socket.emit('game:over', {
        result: game.result ?? 'draw',
        termination: game.termination ?? 'unknown',
        winner: game.result === 'draw' ? null : game.result,
        pgn: game.pgn ?? '',
        whiteRatingDelta: 0,
        blackRatingDelta: 0,
      });
      return;
    }

    const state = await this.gameStateService.getState(payload.gameId);
    if (state) {
      socket.emit('game:clock', {
        white: state.whiteTimeMs,
        black: state.blackTimeMs,
        activeColor: state.activeColor,
        lastUpdatedAt: state.lastMoveAt,
      });
    }
  }

  @SubscribeMessage('game:leave')
  async handleLeaveGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: GameIdPayload,
  ) {
    socket.leave(`game:${payload.gameId}`);
  }

  @SubscribeMessage('game:move')
  async handleMove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: GameMovePayload,
  ) {
    const userId = socket.data.userId as string;

    const game = await this.gamesService.getGameCore(payload.gameId);
    if (!game || game.status !== 'active') {
      socket.emit('error', { code: 'GAME_NOT_ACTIVE', message: 'Game is not active' });
      return;
    }

    const playerColor: 'white' | 'black' | null =
      game.whiteId === userId ? 'white' : game.blackId === userId ? 'black' : null;

    if (!playerColor) {
      socket.emit('error', { code: 'NOT_PLAYER', message: 'You are not a player in this game' });
      return;
    }

    const state = await this.gameStateService.getState(payload.gameId);
    if (!state || state.activeColor !== playerColor) {
      socket.emit('game:move:rejected', { reason: 'Not your turn', from: payload.from, to: payload.to });
      return;
    }

    const result = await this.gameStateService.applyMove(
      payload.gameId,
      payload.from,
      payload.to,
      payload.promotion,
      game.incrementMs,
    );

    if (!result) {
      socket.emit('game:move:rejected', { reason: 'Illegal move', from: payload.from, to: payload.to });
      return;
    }

    const chess = new Chess(result.newFen);
    const moveCount = game._count.moves + 1;
    const timeLeftMs = playerColor === 'white' ? result.clock.white : result.clock.black;

    await this.gamesService.recordMove(
      payload.gameId,
      Math.ceil(moveCount / 2),
      playerColor,
      result.san,
      result.uci,
      result.newFen,
      timeLeftMs,
    );

    const broadcastPayload = {
      move: {
        moveNumber: Math.ceil(moveCount / 2),
        color: playerColor,
        san: result.san,
        uci: result.uci,
        fenAfter: result.newFen,
        timeLeftMs,
      },
      fen: result.newFen,
      clock: result.clock,
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
    };

    this.server.to(`game:${payload.gameId}`).emit('game:move:broadcast', broadcastPayload);

    if (chess.isCheckmate()) {
      const winner = playerColor;
      await this.handleGameOver(payload.gameId, winner === 'white' ? 'white' : 'black', 'checkmate');
      return;
    }

    if (chess.isStalemate()) {
      await this.handleGameOver(payload.gameId, null, 'stalemate');
      return;
    }

    if (chess.isDraw()) {
      const termination = chess.isThreefoldRepetition()
        ? 'threefold_repetition'
        : chess.isInsufficientMaterial()
          ? 'insufficient_material'
          : 'fifty_move_rule';
      await this.handleGameOver(payload.gameId, null, termination);
      return;
    }

    const nextColor = playerColor === 'white' ? 'black' : 'white';
    const nextTimeMs = nextColor === 'white' ? result.clock.white : result.clock.black;

    if (game.isBotGame) {
      const delay = 300 + Math.floor(Math.random() * 600);
      setTimeout(() => {
        this.triggerBotMove(payload.gameId, nextColor, game.botDifficulty ?? 'medium', game.incrementMs, result.clock).catch(
          (err) => this.logger.error(`Bot move error: ${(err as Error).message}`),
        );
      }, delay);
    } else {
      this.clockService.scheduleTimeout(
        payload.gameId,
        nextColor,
        nextTimeMs,
        (gId, loser) => this.handleTimeout(gId, loser),
      );
    }
  }

  @SubscribeMessage('game:resign')
  async handleResign(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: GameIdPayload,
  ) {
    const userId = socket.data.userId as string;
    const game = await this.gamesService.getGameCore(payload.gameId);
    if (!game || game.status !== 'active') return;

    const playerColor: 'white' | 'black' | null =
      game.whiteId === userId ? 'white' : game.blackId === userId ? 'black' : null;
    if (!playerColor) return;

    const winner = playerColor === 'white' ? 'black' : 'white';
    await this.handleGameOver(payload.gameId, winner, 'resignation');
  }

  @SubscribeMessage('game:draw:offer')
  async handleDrawOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: GameIdPayload,
  ) {
    const userId = socket.data.userId as string;
    const game = await this.gamesService.getGameCore(payload.gameId);
    if (!game || game.status !== 'active') return;

    const playerColor: 'white' | 'black' | null =
      game.whiteId === userId ? 'white' : game.blackId === userId ? 'black' : null;
    if (!playerColor) return;

    await this.gameStateService.setDrawOffer(payload.gameId, playerColor);
    this.server.to(`game:${payload.gameId}`).emit('game:draw:offered', { byColor: playerColor });
  }

  @SubscribeMessage('game:draw:accept')
  async handleDrawAccept(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: GameIdPayload,
  ) {
    const state = await this.gameStateService.getState(payload.gameId);
    if (!state?.drawOffer) return;

    await this.handleGameOver(payload.gameId, null, 'draw_agreement');
  }

  @SubscribeMessage('game:draw:decline')
  async handleDrawDecline(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: GameIdPayload,
  ) {
    await this.gameStateService.clearDrawOffer(payload.gameId);
    this.server.to(`game:${payload.gameId}`).emit('game:draw:declined');
  }

  @SubscribeMessage('queue:join')
  async handleQueueJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: QueueJoinPayload,
  ) {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    const matchResult = await this.matchmakingService.joinQueue(userId, payload.timeControlKey);

    if (matchResult) {
      const { gameId, whiteId, blackId } = matchResult;
      const game = await this.gamesService.getGameCore(gameId);

      const whiteSocketRoom = `user:${whiteId}`;
      const blackSocketRoom = `user:${blackId}`;

      this.server.to(whiteSocketRoom).socketsJoin(`game:${gameId}`);
      this.server.to(blackSocketRoom).socketsJoin(`game:${gameId}`);

      const white = game.white;
      const black = game.black;

      this.server.to(whiteSocketRoom).emit('queue:matched', {
        gameId,
        color: 'white',
        opponentUsername: black?.username ?? 'Unknown',
        opponentRating: game.blackRatingBefore ?? 1200,
      });

      this.server.to(blackSocketRoom).emit('queue:matched', {
        gameId,
        color: 'black',
        opponentUsername: white?.username ?? 'Unknown',
        opponentRating: game.whiteRatingBefore ?? 1200,
      });

      this.clockService.scheduleTimeout(
        gameId,
        'white',
        game.initialTimeMs,
        (gId, loser) => this.handleTimeout(gId, loser),
      );
    }
  }

  @SubscribeMessage('queue:leave')
  async handleQueueLeave(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId as string;
    await this.matchmakingService.leaveQueue(userId);
  }

  private async triggerBotMove(
    gameId: string,
    botColor: 'white' | 'black',
    difficulty: string,
    incrementMs: number,
    prevClock: { white: number; black: number },
  ) {
    const botResult = await this.botsService.makeBotMove(
      gameId,
      botColor,
      difficulty as BotDifficulty,
      incrementMs,
    );
    if (!botResult) return;

    const state = await this.gameStateService.getState(gameId);
    const clock = state
      ? { white: state.whiteTimeMs, black: state.blackTimeMs, activeColor: state.activeColor, lastUpdatedAt: state.lastMoveAt }
      : prevClock;

    const freshGame = await this.gamesService.getGameCore(gameId);
    const timeLeftMs = botColor === 'white' ? (state?.whiteTimeMs ?? 0) : (state?.blackTimeMs ?? 0);
    const moveCount = freshGame._count.moves;

    const chess = new Chess(botResult.fen);

    const broadcastPayload = {
      move: {
        moveNumber: Math.ceil(moveCount / 2),
        color: botColor,
        san: botResult.san,
        uci: botResult.uci,
        fenAfter: botResult.fen,
        timeLeftMs,
      },
      fen: botResult.fen,
      clock,
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
    };

    this.server.to(`game:${gameId}`).emit('game:move:broadcast', broadcastPayload);

    if (chess.isCheckmate()) {
      await this.handleGameOver(gameId, botColor, 'checkmate');
    } else if (chess.isStalemate()) {
      await this.handleGameOver(gameId, null, 'stalemate');
    } else if (chess.isDraw()) {
      const term = chess.isThreefoldRepetition() ? 'threefold_repetition' : chess.isInsufficientMaterial() ? 'insufficient_material' : 'fifty_move_rule';
      await this.handleGameOver(gameId, null, term);
    }
  }

  private async handleTimeout(gameId: string, losingColor: 'white' | 'black') {
    const winner = losingColor === 'white' ? 'black' : 'white';
    await this.handleGameOver(gameId, winner, 'timeout');
  }

  private async handleGameOver(
    gameId: string,
    winner: 'white' | 'black' | null,
    termination: string,
  ) {
    this.clockService.cancelTimeout(gameId);

    const result = winner ?? 'draw';
    const { whiteDelta, blackDelta } = await this.gamesService.endGame(
      gameId,
      result as 'white' | 'black' | 'draw' | 'abandoned',
      termination as any,
    );

    const game = await this.gamesService.getGameCore(gameId);

    this.server.to(`game:${gameId}`).emit('game:over', {
      result,
      termination,
      winner,
      whiteRatingDelta: whiteDelta,
      blackRatingDelta: blackDelta,
      pgn: game.pgn ?? '',
    });
  }
}
