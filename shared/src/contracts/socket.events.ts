import type { Color } from '../types/chess.types';
import type { GameClock, GameMove, GameState } from '../types/game.types';

// ─── Client → Server ─────────────────────────────────────────────────────────

export interface ClientToServerEvents {
  'game:move': (payload: GameMovePayload) => void;
  'game:resign': (payload: GameIdPayload) => void;
  'game:draw:offer': (payload: GameIdPayload) => void;
  'game:draw:accept': (payload: GameIdPayload) => void;
  'game:draw:decline': (payload: GameIdPayload) => void;
  'game:spectate': (payload: GameIdPayload) => void;
  'game:leave': (payload: GameIdPayload) => void;
  'queue:join': (payload: QueueJoinPayload) => void;
  'queue:leave': () => void;
  'user:heartbeat': () => void;
}

// ─── Server → Client ─────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:move:broadcast': (payload: MoveBroadcastPayload) => void;
  'game:move:rejected': (payload: MoveRejectedPayload) => void;
  'game:clock': (payload: GameClock) => void;
  'game:over': (payload: GameOverPayload) => void;
  'game:draw:offered': (payload: DrawOfferedPayload) => void;
  'game:draw:declined': () => void;
  'queue:matched': (payload: QueueMatchedPayload) => void;
  'queue:position': (payload: QueuePositionPayload) => void;
  'notification': (payload: NotificationPayload) => void;
  'error': (payload: ErrorPayload) => void;
}

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface GameIdPayload {
  gameId: string;
}

export interface GameMovePayload {
  gameId: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface QueueJoinPayload {
  timeControlKey: string;
}

export interface MoveBroadcastPayload {
  move: GameMove;
  fen: string;
  clock: GameClock;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

export interface MoveRejectedPayload {
  reason: string;
  from: string;
  to: string;
}

export interface GameOverPayload {
  result: string;
  termination: string;
  winner: Color | null;
  whiteRatingDelta: number | null;
  blackRatingDelta: number | null;
  pgn: string;
}

export interface DrawOfferedPayload {
  byColor: Color;
}

export interface QueueMatchedPayload {
  gameId: string;
  color: Color;
  opponentUsername: string;
  opponentRating: number;
}

export interface QueuePositionPayload {
  position: number;
  estimatedWaitMs: number;
}

export interface NotificationPayload {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
