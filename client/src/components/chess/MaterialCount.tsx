import { PieceIcon } from './PieceIcon';

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const STARTING: Record<string, number>     = { p: 8, n: 2, b: 2, r: 2, q: 1 };

// Highest-value pieces first, chess.com display order
const ORDER = ['q', 'r', 'b', 'n', 'p'] as const;

export interface MaterialInfo {
  whiteLost: string[]; // white pieces captured (shown on black's row)
  blackLost: string[]; // black pieces captured (shown on white's row)
  advantage: number;   // positive = white ahead
}

export function parseMaterial(fen: string): MaterialInfo {
  const pos = fen.split(' ')[0];
  const counts: Record<string, number> = {};
  for (const ch of pos) {
    if (ch !== '/' && isNaN(Number(ch))) {
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
  }

  const whiteLost: string[] = [];
  const blackLost: string[] = [];

  for (const piece of ORDER) {
    const upper = piece.toUpperCase();
    const wLost = Math.max(0, STARTING[piece] - (counts[upper] ?? 0));
    const bLost = Math.max(0, STARTING[piece] - (counts[piece]  ?? 0));
    for (let i = 0; i < wLost; i++) whiteLost.push(piece);
    for (let i = 0; i < bLost; i++) blackLost.push(piece);
  }

  let wScore = 0, bScore = 0;
  for (const [ch, cnt] of Object.entries(counts)) {
    const lower = ch.toLowerCase();
    if (!(lower in PIECE_VALUES)) continue;
    if (ch === ch.toUpperCase()) wScore += PIECE_VALUES[lower] * cnt;
    else                         bScore += PIECE_VALUES[lower] * cnt;
  }

  return { whiteLost, blackLost, advantage: wScore - bScore };
}

interface MaterialCountProps {
  // Piece letters captured by THIS player (lowercase = the captured piece type)
  captures: string[];
  // Color of the captured pieces (the opponent's color)
  capturedColor: 'white' | 'black';
  advantage: number; // positive = this side is ahead
}

export function MaterialCount({ captures, capturedColor, advantage }: MaterialCountProps) {
  if (captures.length === 0 && advantage <= 0) return null;

  return (
    <div className="flex items-center gap-px">
      {captures.map((p, i) => (
        <PieceIcon
          key={i}
          type={p as 'p' | 'n' | 'b' | 'r' | 'q'}
          color={capturedColor}
          size={20}
        />
      ))}
      {advantage > 0 && (
        <span className="text-xs font-bold text-muted-foreground ml-1 leading-none">
          +{advantage}
        </span>
      )}
    </div>
  );
}
