import { useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';
import type { Color, Square } from '@chesskernel/shared';

const PIECE_UNICODE: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

interface ChessBoardProps {
  fen: string;
  orientation: Color;
  selectedSquare: Square | null;
  legalMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  onSquareClick: (square: Square) => void;
  disabled?: boolean;
}

export function ChessBoard({
  fen,
  orientation,
  selectedSquare,
  legalMoves,
  lastMove,
  isCheck,
  onSquareClick,
  disabled = false,
}: ChessBoardProps) {
  const chess = useMemo(() => new Chess(fen), [fen]);

  const files = orientation === 'white' ? FILES : [...FILES].reverse();
  const ranks = orientation === 'white' ? RANKS : [...RANKS].reverse();

  const getSquareColor = useCallback(
    (file: string, rank: string): 'light' | 'dark' => {
      const fileIdx = FILES.indexOf(file);
      const rankIdx = parseInt(rank, 10) - 1;
      return (fileIdx + rankIdx) % 2 === 0 ? 'dark' : 'light';
    },
    [],
  );

  const getSquareHighlight = useCallback(
    (square: Square) => {
      if (square === selectedSquare) return 'selected';
      if (lastMove && (square === lastMove.from || square === lastMove.to)) return 'lastMove';
      if (legalMoves.includes(square)) return 'legalMove';

      const piece = chess.get(square as Square);
      if (isCheck && piece?.type === 'k' && piece?.color === chess.turn()) return 'check';

      return null;
    },
    [selectedSquare, lastMove, legalMoves, chess, isCheck],
  );

  return (
    <div className="chess-board relative select-none" style={{ aspectRatio: '1' }}>
      <div className="grid grid-cols-8 grid-rows-8 h-full w-full border border-gray-700">
        {ranks.map((rank) =>
          files.map((file) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const squareColor = getSquareColor(file, rank);
            const highlight = getSquareHighlight(square);

            const baseColor =
              squareColor === 'light' ? 'bg-chess-light' : 'bg-chess-dark';

            const highlightClass =
              highlight === 'selected'
                ? 'bg-chess-selected'
                : highlight === 'lastMove'
                  ? 'bg-chess-lastMove'
                  : highlight === 'check'
                    ? 'bg-chess-check'
                    : baseColor;

            const pieceKey = piece ? `${piece.color}${piece.type.toUpperCase()}` : null;

            return (
              <div
                key={square}
                className={`chess-square ${highlightClass} cursor-pointer hover:brightness-90 transition-all`}
                onClick={() => !disabled && onSquareClick(square)}
              >
                {highlight === 'legalMove' && !piece && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1/3 h-1/3 rounded-full bg-black/20" />
                  </div>
                )}
                {highlight === 'legalMove' && piece && (
                  <div className="absolute inset-0 rounded-full ring-4 ring-black/30" />
                )}
                {piece && pieceKey && (
                  <motion.span
                    key={`${square}-${piece.type}-${piece.color}`}
                    className="chess-piece text-4xl z-10 leading-none"
                    style={{ textShadow: piece.color === 'w' ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(255,255,255,0.2)' }}
                    initial={{ scale: 0.8, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.1 }}
                  >
                    {PIECE_UNICODE[pieceKey]}
                  </motion.span>
                )}
                {file === files[0] && (
                  <span className="absolute top-0.5 left-0.5 text-xs font-bold opacity-60 text-foreground">
                    {rank}
                  </span>
                )}
                {rank === ranks[ranks.length - 1] && (
                  <span className="absolute bottom-0.5 right-0.5 text-xs font-bold opacity-60 text-foreground">
                    {file}
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
