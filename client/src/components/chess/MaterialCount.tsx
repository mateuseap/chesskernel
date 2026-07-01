// Material count: captured pieces + advantage, chess.com style.
// Shown above/below the board next to each player's name.

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const STARTING: Record<string, number>     = { p: 8, n: 2, b: 2, r: 2, q: 1 };

// Ordered by value, highest first — matches chess.com display order
const ORDER = ['q', 'r', 'b', 'n', 'p'] as const;

// Unicode symbols — display the captured piece in the capturer's row
const PIECE_UNICODE: Record<string, string> = {
  q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
  Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟',
};

export interface MaterialInfo {
  // pieces that black captured (white lost them) — shown on black's row
  whiteLost: string[];
  // pieces that white captured (black lost them) — shown on white's row
  blackLost: string[];
  // positive = white ahead, negative = black ahead
  advantage: number;
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
    const bLost = Math.max(0, STARTING[piece] - (counts[piece] ?? 0));
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
  // Which pieces to show: 'white' = white's captures (black pieces taken by white)
  captures: string[];
  advantage: number; // positive means THIS side is ahead
}

export function MaterialCount({ captures, advantage }: MaterialCountProps) {
  if (captures.length === 0 && advantage <= 0) return null;

  return (
    <div className="flex items-center gap-0.5 min-h-[14px]">
      {captures.map((p, i) => (
        <span
          key={i}
          className="leading-none select-none text-muted-foreground"
          style={{ fontSize: 12, lineHeight: 1 }}
        >
          {PIECE_UNICODE[p]}
        </span>
      ))}
      {advantage > 0 && (
        <span className="text-[10px] font-bold text-muted-foreground ml-0.5 leading-none">
          +{advantage}
        </span>
      )}
    </div>
  );
}
