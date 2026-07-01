import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square as RCBSquare, Piece, Arrow } from 'react-chessboard/dist/chessboard/types';
import { cn } from '@/lib/utils';

// Chess.com exact classification colors
const CLS: Record<string, { bg: string; text: string; icon: string; sqColor: string }> = {
  brilliant:  { bg: '#1baaa6', text: '#fff', icon: '!!',  sqColor: 'rgba(27,170,166,0.55)' },
  great:      { bg: '#5ba3b0', text: '#fff', icon: '!',   sqColor: 'rgba(91,163,176,0.55)' },
  best:       { bg: '#96bc4b', text: '#fff', icon: '★',   sqColor: 'rgba(150,188,75,0.50)' },
  excellent:  { bg: '#96bc4b', text: '#fff', icon: '✓',   sqColor: 'rgba(150,188,75,0.40)' },
  good:       { bg: '#7d9c40', text: '#fff', icon: '',    sqColor: 'rgba(150,188,75,0.28)' },
  book:       { bg: '#a88865', text: '#fff', icon: '📖',  sqColor: 'rgba(168,136,101,0.55)' },
  inaccuracy: { bg: '#f0c648', text: '#222', icon: '?!',  sqColor: 'rgba(240,198,72,0.55)' },
  mistake:    { bg: '#e68b2c', text: '#fff', icon: '?',   sqColor: 'rgba(230,139,44,0.55)' },
  blunder:    { bg: '#ca3431', text: '#fff', icon: '??',  sqColor: 'rgba(202,52,49,0.55)' },
  miss:       { bg: '#ca3431', text: '#fff', icon: '×',   sqColor: 'rgba(202,52,49,0.45)' },
};

// SVG icon paths for each classification badge (used inside the ArrowLayer SVG)
// Viewbox per icon: 0 0 10 10
const BADGE_ICONS: Record<string, React.ReactNode> = {
  brilliant: (
    <>
      <text x="5" y="7.8" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#fff" fontFamily="monospace">!!</text>
    </>
  ),
  great: (
    <text x="5" y="7.8" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#fff" fontFamily="monospace">!</text>
  ),
  best: (
    // Star
    <path d="M5,1.2 L6.18,4.09 L9.27,4.09 L6.8,5.91 L7.73,8.8 L5,7.04 L2.27,8.8 L3.2,5.91 L0.73,4.09 L3.82,4.09 Z" fill="#fff" />
  ),
  excellent: (
    // Checkmark
    <path d="M1.5,5.2 L3.8,7.8 L8.5,2.2" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  book: (
    <text x="5" y="7.8" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff" fontFamily="serif">B</text>
  ),
  inaccuracy: (
    <text x="5" y="7.8" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#222" fontFamily="monospace">?!</text>
  ),
  mistake: (
    <text x="5" y="7.8" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#fff" fontFamily="monospace">?</text>
  ),
  blunder: (
    <text x="5" y="7.8" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#fff" fontFamily="monospace">??</text>
  ),
  miss: (
    // X cross
    <>
      <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7.5" y1="2.5" x2="2.5" y2="7.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
};

// ─── Custom arrow overlay ─────────────────────────────────────────────────────

type ArrowDef = { from: string; to: string; color: string };

// Square algebraic → SVG coordinate in an 8×8 viewBox
function sqToXY(sq: string, orientation: 'white' | 'black') {
  const col = sq.charCodeAt(0) - 97; // a=0 … h=7
  const row = parseInt(sq[1]) - 1;   // 1=0 … 8=7
  return orientation === 'white'
    ? { x: col + 0.5, y: (7 - row) + 0.5 }
    : { x: (7 - col) + 0.5, y: row + 0.5 };
}

function isKnightJump(from: string, to: string) {
  const dc = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
  const dr = Math.abs(parseInt(from[1]) - parseInt(to[1]));
  return (dc === 1 && dr === 2) || (dc === 2 && dr === 1);
}


function ArrowLayer({
  arrows,
  previewFrom,
  previewTo,
  orientation,
  badgeSquare,
  badgeCls,
}: {
  arrows: ArrowDef[];
  previewFrom: string | null;
  previewTo: string | null;
  orientation: 'white' | 'black';
  badgeSquare?: string | null;
  badgeCls?: string | null;
}) {
  const all: (ArrowDef & { preview?: boolean })[] = [
    ...arrows,
    ...(previewFrom && previewTo && previewFrom !== previewTo
      ? [{ from: previewFrom, to: previewTo, color: 'rgba(255,170,0,0.88)', preview: true }]
      : []),
  ];

  if (!all.length) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 8 8"
      style={{ zIndex: 10 }}
    >
      <defs>
        {all.map(({ color, preview }, i) => (
          <marker
            key={i}
            id={`ah-${i}`}
            markerWidth="3.5"
            markerHeight="3.5"
            refX="1.75"
            refY="1.75"
            orient="auto"
          >
            <path d="M0,0 L0,3.5 L3.5,1.75 z" fill={color} opacity={preview ? 0.55 : 1} />
          </marker>
        ))}
      </defs>

      {all.map(({ from, to, color, preview }, i) => {
        const f = sqToXY(from, orientation);
        const t = sqToXY(to, orientation);
        const opacity = preview ? 0.55 : 0.88;
        const sw = 0.14; // stroke-width in SVG units

        if (isKnightJump(from, to)) {
          // L-shaped arrow: travel along the 2-square axis first, then the 1-square axis
          const fromCol = from.charCodeAt(0) - 97;
          const fromRow = parseInt(from[1]) - 1;
          const toCol   = to.charCodeAt(0) - 97;
          const toRow   = parseInt(to[1]) - 1;
          const dc = toCol - fromCol;
          const dr = toRow - fromRow;

          let bendCol: number, bendRow: number;
          if (Math.abs(dc) === 2) {
            bendCol = fromCol + dc; // horizontal first
            bendRow = fromRow;
          } else {
            bendCol = fromCol;     // vertical first
            bendRow = fromRow + dr;
          }

          const b = sqToXY(`${'abcdefgh'[bendCol]}${bendRow + 1}`, orientation);

          // Shorten end of last segment for arrowhead room
          const ex = t.x - b.x;
          const ey = t.y - b.y;
          const elen = Math.sqrt(ex * ex + ey * ey) || 1;
          const tx = t.x - (ex / elen) * 0.28;
          const ty = t.y - (ey / elen) * 0.28;

          // Shorten start slightly so arrow starts at edge of square
          const sx2 = f.x + (b.x - f.x) * 0.28;
          const sy2 = f.y + (b.y - f.y) * 0.28;

          return (
            <path
              key={i}
              d={`M${sx2},${sy2} L${b.x},${b.y} L${tx},${ty}`}
              stroke={color}
              strokeWidth={sw}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
              markerEnd={`url(#ah-${i})`}
            />
          );
        }

        // Straight arrow
        const dx = t.x - f.x;
        const dy = t.y - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const sx = f.x + (dx / dist) * 0.28;
        const sy = f.y + (dy / dist) * 0.28;
        const ex = t.x - (dx / dist) * 0.28;
        const ey = t.y - (dy / dist) * 0.28;

        return (
          <line
            key={i}
            x1={sx} y1={sy} x2={ex} y2={ey}
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            opacity={opacity}
            markerEnd={`url(#ah-${i})`}
          />
        );
      })}

      {/* Classification badge — rendered in SVG coords, perfectly aligned to square */}
      {badgeSquare && badgeCls && (() => {
        const meta = CLS[badgeCls];
        const icon = BADGE_ICONS[badgeCls];
        if (!meta || !icon) return null;
        const col = badgeSquare.charCodeAt(0) - 97;
        const row = parseInt(badgeSquare[1]) - 1;
        // Bottom-right corner of the destination square in SVG coords
        const cx = orientation === 'white' ? col + 0.82 : (7 - col) + 0.18;
        const cy = orientation === 'white' ? (7 - row) + 0.82 : row + 0.18;
        const r  = 0.38; // radius in viewBox units
        return (
          <g key="badge" transform={`translate(${cx - r}, ${cy - r}) scale(${r * 2 / 10})`} style={{ pointerEvents: 'none' }}>
            <circle cx="5" cy="5" r="5" fill={meta.bg} />
            <circle cx="5" cy="5" r="5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
            {icon}
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChessBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  onSquareClick: (sq: string) => void;
  onDrop?: (from: string, to: string) => boolean;
  disabled?: boolean;
  moveClassification?: string | null;
  customArrows?: Arrow[];
  illegalFlash?: boolean;
}

export function ChessBoard({
  fen,
  orientation,
  selectedSquare,
  legalMoves,
  lastMove,
  onSquareClick,
  onDrop,
  disabled = false,
  moveClassification,
  customArrows: externalArrows,
  illegalFlash = false,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [userArrows, setUserArrows] = useState<ArrowDef[]>([]);
  const [previewFrom, setPreviewFrom] = useState<string | null>(null);
  const [previewTo,   setPreviewTo]   = useState<string | null>(null);

  // Convert mouse position to algebraic square
  const getSquare = useCallback((clientX: number, clientY: number): string | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top)  / rect.height;
    if (px < 0 || px > 1 || py < 0 || py > 1) return null;
    const col = orientation === 'white' ? Math.floor(px * 8) : 7 - Math.floor(px * 8);
    const row = orientation === 'white' ? 7 - Math.floor(py * 8) : Math.floor(py * 8);
    return `${'abcdefgh'[col]}${row + 1}`;
  }, [orientation]);

  // Right-click arrow drawing — capture phase so react-chessboard doesn't see right-clicks
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    let fromSq: string | null = null;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      e.preventDefault();
      e.stopPropagation();
      fromSq = getSquare(e.clientX, e.clientY);
      if (fromSq) { setPreviewFrom(fromSq); setPreviewTo(fromSq); }
    };

    const onMove = (e: MouseEvent) => {
      if (!fromSq) return;
      const sq = getSquare(e.clientX, e.clientY);
      if (sq) setPreviewTo(sq);
    };

    const onUp = (e: MouseEvent) => {
      if (e.button !== 2 || !fromSq) return;
      const toSq = getSquare(e.clientX, e.clientY);
      if (toSq && toSq !== fromSq) {
        const f = fromSq;
        setUserArrows(prev => {
          const key = `${f}${toSq}`;
          if (prev.some(a => `${a.from}${a.to}` === key)) {
            return prev.filter(a => `${a.from}${a.to}` !== key); // toggle off
          }
          return [...prev, { from: f, to: toSq, color: 'rgba(255,170,0,0.88)' }];
        });
      }
      fromSq = null;
      setPreviewFrom(null);
      setPreviewTo(null);
    };

    const noCtxMenu = (e: Event) => e.preventDefault();

    el.addEventListener('mousedown',   onDown,    { capture: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    el.addEventListener('contextmenu', noCtxMenu);

    return () => {
      el.removeEventListener('mousedown',   onDown,    { capture: true });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      el.removeEventListener('contextmenu', noCtxMenu);
    };
  }, [getSquare]);

  // Merge user arrows + external (analysis best-move) arrows
  const allArrows = useMemo<ArrowDef[]>(() => [
    ...userArrows,
    ...(externalArrows ?? []).map(a => ({
      from:  a[0] as string,
      to:    a[1] as string,
      color: a[2] ?? 'rgba(0,190,100,0.85)',
    })),
  ], [userArrows, externalArrows]);

  const handlePieceDrop = useCallback(
    (source: RCBSquare, target: RCBSquare, _piece: Piece): boolean => {
      if (disabled || !onDrop) return false;
      setUserArrows([]);
      return onDrop(source, target);
    },
    [disabled, onDrop],
  );

  const handleSquareClick = useCallback(
    (sq: RCBSquare) => {
      if (disabled) return;
      setUserArrows([]);
      onSquareClick(sq);
    },
    [disabled, onSquareClick],
  );

  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    const sqColor = moveClassification ? CLS[moveClassification]?.sqColor : undefined;
    const fallback = 'rgba(155,199,0,0.38)';
    customSquareStyles[lastMove.from] = { backgroundColor: sqColor ?? fallback };
    customSquareStyles[lastMove.to]   = { backgroundColor: sqColor ?? fallback };
  }

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: 'rgba(20,85,30,0.5)' };
  }

  legalMoves.forEach((sq) => {
    customSquareStyles[sq] = {
      background: 'radial-gradient(circle, rgba(0,0,0,.15) 24%, transparent 24%)',
    };
  });

  return (
    <div
      ref={boardRef}
      className={cn(
        'w-full aspect-square select-none relative',
        illegalFlash && 'animate-illegal-flash',
      )}
    >
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        arePiecesDraggable={!disabled}
        customSquareStyles={customSquareStyles as any}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
        customBoardStyle={{ borderRadius: '2px', boxShadow: '0 6px 40px rgba(0,0,0,0.4)' }}
        showBoardNotation
        animationDuration={0}
      />

      {/* SVG overlay: arrows + classification badge — all in square-coordinate space */}
      <ArrowLayer
        arrows={allArrows}
        previewFrom={previewFrom !== previewTo ? previewFrom : null}
        previewTo={previewFrom !== previewTo ? previewTo : null}
        orientation={orientation}
        badgeSquare={lastMove?.to ?? null}
        badgeCls={moveClassification ?? null}
      />
    </div>
  );
}
