import type {
  Color,
  GameResult,
  GameStatus,
  GameTermination,
  TimeControl,
  TimeControlConfig,
  BotDifficulty,
  MoveClassification,
} from './chess.types';
import type { UserProfile } from './user.types';

export interface GamePlayer {
  id: string;
  username: string;
  avatarUrl: string | null;
  rating: number;
  ratingDelta: number | null;
}

export interface GameClock {
  white: number;
  black: number;
  activeColor: Color;
  lastUpdatedAt: number;
}

export interface GameMove {
  moveNumber: number;
  color: Color;
  san: string;
  uci: string;
  fenAfter: string;
  timeLeftMs: number;
}

export interface GameState {
  id: string;
  white: GamePlayer | null;
  black: GamePlayer | null;
  status: GameStatus;
  result: GameResult | null;
  termination: GameTermination | null;
  timeControl: TimeControl;
  timeControlConfig: TimeControlConfig;
  fen: string;
  pgn: string | null;
  moves: GameMove[];
  clock: GameClock;
  isBotGame: boolean;
  botDifficulty: BotDifficulty | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawOffer: Color | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface GameSummary {
  id: string;
  white: Pick<UserProfile, 'id' | 'username' | 'avatarUrl'> | null;
  black: Pick<UserProfile, 'id' | 'username' | 'avatarUrl'> | null;
  timeControl: TimeControl;
  timeControlConfig: TimeControlConfig;
  result: GameResult | null;
  termination: GameTermination | null;
  isBotGame: boolean;
  botDifficulty: BotDifficulty | null;
  whiteRatingBefore: number | null;
  blackRatingBefore: number | null;
  whiteRatingDelta: number | null;
  blackRatingDelta: number | null;
  pgn: string | null;
  moveCount: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface MoveAnalysisResult {
  moveNumber: number;
  color: Color;
  evalCentipawns: number | null;
  mateIn: number | null;
  bestMoveUci: string;
  classification: MoveClassification;
}

export interface GameAnalysis {
  id: string;
  gameId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  engineVersion: string | null;
  depth: number | null;
  moves: MoveAnalysisResult[];
  completedAt: string | null;
  createdAt: string;
}
