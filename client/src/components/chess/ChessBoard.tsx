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

// Standalone classification badge: its own SVG overlay, independent of arrows
function ClassificationBadge({
  square, cls, orientation,
}: {
  square: string; cls: string; orientation: 'white' | 'black';
}) {
  const meta = CLS[cls];
  if (!meta || !meta.icon) return null;

  const center = sqToXY(square, orientation);
  const r = 0.22; // radius in SVG viewBox units (≈22px on a 450px board)

  // Bottom-right corner of the square, inset by r so the badge sits inside
  const cx = center.x + (0.5 - r);
  const cy = center.y + (0.5 - r);

  const tc = meta.text; // text/icon colour

  let icon: React.ReactNode;
  if (cls === 'best') {
    // 5-point star
    const s = r * 0.72;
    icon = (
      <path
        d={`M${cx},${cy - s} L${cx + s*0.29},${cy - s*0.09} L${cx + s*0.95},${cy - s*0.31} L${cx + s*0.47},${cy + s*0.40} L${cx + s*0.59},${cy + s} L${cx},${cy + s*0.62} L${cx - s*0.59},${cy + s} L${cx - s*0.47},${cy + s*0.40} L${cx - s*0.95},${cy - s*0.31} L${cx - s*0.29},${cy - s*0.09} Z`}
        fill={tc}
      />
    );
  } else if (cls === 'excellent') {
    icon = (
      <path
        d={`M${cx - r*0.52},${cy - r*0.08} L${cx - r*0.08},${cy + r*0.48} L${cx + r*0.56},${cy - r*0.52}`}
        stroke={tc} strokeWidth={r * 0.32} fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
    );
  } else if (cls === 'miss') {
    const o = r * 0.46;
    icon = (
      <>
        <line x1={cx - o} y1={cy - o} x2={cx + o} y2={cy + o} stroke={tc} strokeWidth={r * 0.3} strokeLinecap="round" />
        <line x1={cx + o} y1={cy - o} x2={cx - o} y2={cy + o} stroke={tc} strokeWidth={r * 0.3} strokeLinecap="round" />
      </>
    );
  } else {
    // Text glyphs: !, !!, ?, ??, ?!, B
    const two = meta.icon.length > 1;
    icon = (
      <text
        x={cx} y={cy + r * 0.37}
        textAnchor="middle"
        fontSize={two ? r * 0.72 : r * 1.05}
        fontWeight="900"
        fill={tc}
        fontFamily="system-ui,sans-serif"
      >
        {meta.icon}
      </text>
    );
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 8 8"
      style={{ zIndex: 20 }}
    >
      <circle cx={cx} cy={cy} r={r} fill={meta.bg} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.02" />
      {icon}
    </svg>
  );
}

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
}: {
  arrows: ArrowDef[];
  previewFrom: string | null;
  previewTo: string | null;
  orientation: 'white' | 'black';
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

  // Right-click arrow drawing: capture phase so react-chessboard doesn't see right-clicks
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

      {/* Arrow overlay */}
      <ArrowLayer
        arrows={allArrows}
        previewFrom={previewFrom !== previewTo ? previewFrom : null}
        previewTo={previewFrom !== previewTo ? previewTo : null}
        orientation={orientation}
      />

      {/* Classification badge: standalone SVG, not coupled to arrows */}
      {lastMove?.to && moveClassification && (
        <ClassificationBadge
          square={lastMove.to}
          cls={moveClassification}
          orientation={orientation}
        />
      )}
    </div>
  );
}
