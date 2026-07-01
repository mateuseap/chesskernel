import { useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square as RCBSquare, Piece } from 'react-chessboard/dist/chessboard/types';

interface ChessBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  onSquareClick: (sq: string) => void;
  onDrop?: (from: string, to: string) => void;
  disabled?: boolean;
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
}: ChessBoardProps) {
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(155, 199, 0, 0.41)' };
    customSquareStyles[lastMove.to] = { backgroundColor: 'rgba(155, 199, 0, 0.41)' };
  }

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: 'rgba(20, 85, 30, 0.5)' };
  }

  legalMoves.forEach((sq) => {
    customSquareStyles[sq] = {
      background: 'radial-gradient(circle, rgba(0,0,0,.18) 26%, transparent 26%)',
    };
  });

  const handlePieceDrop = useCallback(
    (source: RCBSquare, target: RCBSquare, _piece: Piece): boolean => {
      if (disabled || !onDrop) return false;
      onDrop(source, target);
      return true;
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
    <div className="w-full aspect-square select-none">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        arePiecesDraggable={!disabled}
        customSquareStyles={customSquareStyles as any}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
        customBoardStyle={{ borderRadius: '3px', boxShadow: '0 6px 40px rgba(0,0,0,0.5)' }}
        showBoardNotation
        animationDuration={150}
      />
    </div>
  );
}
