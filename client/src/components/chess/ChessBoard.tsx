import { useCallback, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessPiece } from './ChessPiece';
import { cn } from '@/lib/utils';
import type { Color, Square } from '@chesskernel/shared';

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
  onDrop?: (from: Square, to: Square) => void;
  disabled?: boolean;
}

function squareColor(file: string, rank: string): 'light' | 'dark' {
  return (FILES.indexOf(file) + parseInt(rank, 10)) % 2 === 0 ? 'dark' : 'light';
}

export function ChessBoard({
  fen,
  orientation,
  selectedSquare,
  legalMoves,
  lastMove,
  isCheck,
  onSquareClick,
  onDrop,
  disabled = false,
}: ChessBoardProps) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const dragSquare = useRef<Square | null>(null);
  const [dragOver, setDragOver] = useState<Square | null>(null);

  const files = orientation === 'white' ? FILES : [...FILES].reverse();
  const ranks = orientation === 'white' ? RANKS : [...RANKS].reverse();

  const getHighlight = useCallback(
    (sq: Square): 'selected' | 'lastMove' | 'legalMove' | 'check' | null => {
      if (sq === selectedSquare) return 'selected';
      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) return 'lastMove';
      if (legalMoves.includes(sq)) return 'legalMove';
      const piece = chess.get(sq);
      if (isCheck && piece?.type === 'k' && piece?.color === chess.turn()) return 'check';
      return null;
    },
    [selectedSquare, lastMove, legalMoves, chess, isCheck],
  );

  const handleDragStart = (e: React.DragEvent, sq: Square) => {
    if (disabled) { e.preventDefault(); return; }
    dragSquare.current = sq;
    e.dataTransfer.effectAllowed = 'move';
    // ghost image: use a 1x1 transparent image so we render our own
    const ghost = document.createElement('canvas');
    ghost.width = ghost.height = 1;
    e.dataTransfer.setDragImage(ghost, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, sq: Square) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(sq);
  };

  const handleDrop = (e: React.DragEvent, sq: Square) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragSquare.current || dragSquare.current === sq) return;
    if (onDrop) onDrop(dragSquare.current, sq);
    dragSquare.current = null;
  };

  const handleDragEnd = () => {
    dragSquare.current = null;
    setDragOver(null);
  };

  return (
    <div className="relative select-none w-full aspect-square rounded-sm overflow-hidden shadow-2xl border border-black/20 dark:border-white/10">
      <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
        {ranks.map((rank, ri) =>
          files.map((file, fi) => {
            const sq = `${file}${rank}` as Square;
            const piece = chess.get(sq);
            const sc = squareColor(file, rank);
            const hl = getHighlight(sq);
            const isDragTarget = dragOver === sq;
            const isLegal = legalMoves.includes(sq);
            const isLastMove = lastMove && (sq === lastMove.from || sq === lastMove.to);
            const isDragging = dragSquare.current === sq;

            return (
              <div
                key={sq}
                className={cn(
                  'relative flex items-center justify-center cursor-pointer transition-colors duration-75',
                  sc === 'light'
                    ? 'bg-[#f0d9b5] dark:bg-[#cda882]'
                    : 'bg-[#b58863] dark:bg-[#8b6443]',
                  hl === 'selected' && 'bg-[#f6f669] dark:bg-[#caca2f]',
                  isLastMove && !hl && 'bg-[#cdd16a] dark:bg-[#a8ac41]',
                  hl === 'check' && 'bg-red-500',
                  isDragTarget && isLegal && 'brightness-110',
                )}
                onClick={() => !disabled && onSquareClick(sq)}
                onDragOver={(e) => handleDragOver(e, sq)}
                onDrop={(e) => handleDrop(e, sq)}
              >
                {/* Coordinate labels */}
                {fi === 0 && (
                  <span className={cn(
                    'absolute top-0.5 left-0.5 text-[10px] font-bold leading-none z-10 pointer-events-none',
                    sc === 'light' ? 'text-[#b58863]' : 'text-[#f0d9b5]',
                  )}>
                    {rank}
                  </span>
                )}
                {ri === 7 && (
                  <span className={cn(
                    'absolute bottom-0.5 right-1 text-[10px] font-bold leading-none z-10 pointer-events-none',
                    sc === 'light' ? 'text-[#b58863]' : 'text-[#f0d9b5]',
                  )}>
                    {file}
                  </span>
                )}

                {/* Legal move dots */}
                {isLegal && !piece && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-[32%] h-[32%] rounded-full bg-black/25 dark:bg-black/35" />
                  </div>
                )}
                {isLegal && piece && (
                  <div className="absolute inset-0 rounded-sm ring-[6px] ring-black/25 dark:ring-black/35 pointer-events-none z-10" />
                )}

                {/* Drag-over highlight ring */}
                {isDragTarget && (
                  <div className="absolute inset-0 bg-[#f6f669]/60 pointer-events-none z-10" />
                )}

                {/* Piece */}
                {piece && (
                  <div
                    draggable={!disabled}
                    onDragStart={(e) => handleDragStart(e, sq)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'absolute inset-0 flex items-center justify-center z-20 transition-opacity',
                      isDragging && 'opacity-40',
                      !disabled && 'cursor-grab active:cursor-grabbing',
                    )}
                  >
                    <div className="w-[85%] h-[85%] drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
                      <ChessPiece type={piece.type as any} color={piece.color as 'w' | 'b'} />
                    </div>
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
