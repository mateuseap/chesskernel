import { useCallback } from 'react';
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

// Circular badge overlaid on the destination square — bottom-right corner
function SquareBadge({ square, cls, orientation }: { square: string; cls: string; orientation: 'white' | 'black' }) {
  const meta = CLS[cls];
  if (!meta || !meta.icon) return null;

  const col = square.charCodeAt(0) - 97; // a=0 … h=7
  const row = parseInt(square[1]) - 1;   // 1=0 … 8=7

  // Distance from right/bottom of the board to the right/bottom of the square
  const rightPct = orientation === 'white' ? (7 - col) * 12.5 : col * 12.5;
  const bottomPct = orientation === 'white' ? row * 12.5 : (7 - row) * 12.5;

  return (
    <div
      className="absolute pointer-events-none flex items-center justify-center font-black"
      style={{
        right:   `calc(${rightPct}% + 2px)`,
        bottom:  `calc(${bottomPct}% + 2px)`,
        width:   22,
        height:  22,
        borderRadius: '50%',
        backgroundColor: meta.bg,
        color:   meta.text,
        fontSize: meta.icon.length > 1 ? 7 : 10,
        lineHeight: 1,
        zIndex:  20,
        boxShadow: '0 1px 5px rgba(0,0,0,0.55)',
        border:  '1.5px solid rgba(255,255,255,0.3)',
      }}
    >
      {meta.icon}
    </div>
  );
}

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
  customArrows,
  illegalFlash = false,
}: ChessBoardProps) {
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    const sqColor = moveClassification ? (CLS[moveClassification]?.sqColor) : undefined;
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

  const handlePieceDrop = useCallback(
    (source: RCBSquare, target: RCBSquare, _piece: Piece): boolean => {
      if (disabled || !onDrop) return false;
      return onDrop(source, target);
    },
    [disabled, onDrop],
  );

  const handleSquareClick = useCallback(
    (sq: RCBSquare) => {
      if (disabled) return;
      onSquareClick(sq);
    },
    [disabled, onSquareClick],
  );

  return (
    <div
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
        customArrows={customArrows}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
        customBoardStyle={{ borderRadius: '2px', boxShadow: '0 6px 40px rgba(0,0,0,0.4)' }}
        showBoardNotation
        animationDuration={0}
      />

      {/* Classification badge overlay on destination square */}
      {lastMove?.to && moveClassification && (
        <SquareBadge square={lastMove.to} cls={moveClassification} orientation={orientation} />
      )}
    </div>
  );
}
