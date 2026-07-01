import { useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square as RCBSquare, Piece, Arrow } from 'react-chessboard/dist/chessboard/types';
import { cn } from '@/lib/utils';

// Chess.com exact classification colors for board squares
const CLASSIFICATION_SQUARE_COLORS: Record<string, string> = {
  brilliant:  'rgba(27,  170, 166, 0.55)',
  great:      'rgba(91,  163, 176, 0.55)',
  best:       'rgba(150, 188, 75,  0.50)',
  excellent:  'rgba(150, 188, 75,  0.40)',
  good:       'rgba(150, 188, 75,  0.28)',
  book:       'rgba(168, 136, 101, 0.55)',
  inaccuracy: 'rgba(240, 198, 72,  0.55)',
  mistake:    'rgba(230, 139, 44,  0.55)',
  blunder:    'rgba(202, 52,  49,  0.55)',
  miss:       'rgba(202, 52,  49,  0.45)',
};

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
  /** Arrow from best-move alternative (analysis page) */
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
    const classColor = moveClassification
      ? CLASSIFICATION_SQUARE_COLORS[moveClassification]
      : undefined;
    const defaultHighlight = 'rgba(155, 199, 0, 0.38)';
    customSquareStyles[lastMove.from] = { backgroundColor: classColor ?? defaultHighlight };
    customSquareStyles[lastMove.to]   = { backgroundColor: classColor ?? defaultHighlight };
  }

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: 'rgba(20, 85, 30, 0.5)' };
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
        'w-full aspect-square select-none',
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
    </div>
  );
}
