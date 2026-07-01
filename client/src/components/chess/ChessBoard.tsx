import { useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square as RCBSquare, Piece, Arrow } from 'react-chessboard/dist/chessboard/types';
import { cn } from '@/lib/utils';

const CLASSIFICATION_COLORS: Record<string, string> = {
  blunder:    'rgba(220, 40,  40,  0.55)',
  mistake:    'rgba(220, 120, 40,  0.50)',
  inaccuracy: 'rgba(220, 180, 40,  0.45)',
  book:       'rgba(100, 140, 220, 0.40)',
  good:       'rgba(80,  160, 220, 0.35)',
  excellent:  'rgba(80,  200, 100, 0.40)',
  best:       'rgba(50,  200, 80,  0.45)',
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
  /** Analysis: color "to" square by move quality */
  moveClassification?: string | null;
  /** Analysis: draw green arrow for best alternative */
  bestMoveArrow?: [string, string] | null;
  /** User-drawn arrows (right-click drag) */
  arrows?: Arrow[];
  onArrowsChange?: (arrows: Arrow[]) => void;
  /** Flash red border on illegal move attempt */
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
  bestMoveArrow,
  arrows = [],
  onArrowsChange,
  illegalFlash = false,
}: ChessBoardProps) {
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    const classColor = moveClassification ? CLASSIFICATION_COLORS[moveClassification] : undefined;
    customSquareStyles[lastMove.from] = {
      backgroundColor: classColor ?? 'rgba(155, 199, 0, 0.41)',
    };
    customSquareStyles[lastMove.to] = {
      backgroundColor: classColor ?? 'rgba(155, 199, 0, 0.41)',
    };
  }

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: 'rgba(20, 85, 30, 0.5)' };
  }

  legalMoves.forEach((sq) => {
    customSquareStyles[sq] = {
      background: 'radial-gradient(circle, rgba(0,0,0,.18) 26%, transparent 26%)',
    };
  });

  const allArrows: Arrow[] = [...arrows];
  if (bestMoveArrow) {
    allArrows.push([bestMoveArrow[0] as RCBSquare, bestMoveArrow[1] as RCBSquare, 'rgba(0, 190, 100, 0.8)']);
  }

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
        'w-full aspect-square select-none rounded-sm transition-shadow duration-200',
        illegalFlash && 'animate-illegal-flash',
      )}
    >
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        onArrowsChange={onArrowsChange}
        arePiecesDraggable={!disabled}
        customSquareStyles={customSquareStyles as any}
        customArrows={allArrows}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
        customBoardStyle={{ borderRadius: '2px', boxShadow: '0 4px 32px rgba(0,0,0,0.45)' }}
        showBoardNotation
        animationDuration={150}
      />
    </div>
  );
}
