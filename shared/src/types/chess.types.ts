export type Color = 'white' | 'black';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export type Square =
  | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8'
  | 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8'
  | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8'
  | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8'
  | 'e1' | 'e2' | 'e3' | 'e4' | 'e5' | 'e6' | 'e7' | 'e8'
  | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8'
  | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'g8'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7' | 'h8';

export interface ChessMove {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

export interface ChessMoveResult extends ChessMove {
  san: string;
  uci: string;
  fen: string;
  moveNumber: number;
  color: Color;
}

export type GameStatus = 'waiting' | 'active' | 'ended' | 'abandoned';

export type GameResult = 'white' | 'black' | 'draw' | 'abandoned';

export type GameTermination =
  | 'checkmate'
  | 'timeout'
  | 'resignation'
  | 'draw_agreement'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'abandoned';

export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';

export interface TimeControlConfig {
  initialTimeMs: number;
  incrementMs: number;
  label: string;
  type: TimeControl;
}

export const TIME_CONTROLS: Record<string, TimeControlConfig> = {
  bullet_1_0: { initialTimeMs: 60_000, incrementMs: 0, label: '1+0', type: 'bullet' },
  bullet_1_1: { initialTimeMs: 60_000, incrementMs: 1_000, label: '1+1', type: 'bullet' },
  bullet_2_1: { initialTimeMs: 120_000, incrementMs: 1_000, label: '2+1', type: 'bullet' },
  blitz_3_0: { initialTimeMs: 180_000, incrementMs: 0, label: '3+0', type: 'blitz' },
  blitz_3_2: { initialTimeMs: 180_000, incrementMs: 2_000, label: '3+2', type: 'blitz' },
  blitz_5_0: { initialTimeMs: 300_000, incrementMs: 0, label: '5+0', type: 'blitz' },
  blitz_5_3: { initialTimeMs: 300_000, incrementMs: 3_000, label: '5+3', type: 'blitz' },
  rapid_10_0: { initialTimeMs: 600_000, incrementMs: 0, label: '10+0', type: 'rapid' },
  rapid_10_5: { initialTimeMs: 600_000, incrementMs: 5_000, label: '10+5', type: 'rapid' },
  rapid_15_10: { initialTimeMs: 900_000, incrementMs: 10_000, label: '15+10', type: 'rapid' },
  classical_30_0: { initialTimeMs: 1_800_000, incrementMs: 0, label: '30+0', type: 'classical' },
  classical_30_20: { initialTimeMs: 1_800_000, incrementMs: 20_000, label: '30+20', type: 'classical' },
};

export type BotDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' | 'maximum';

export type MoveClassification =
  | 'book'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';
