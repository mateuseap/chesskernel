import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { ChessClock } from '@/components/chess/ChessClock';
import { useGameStore } from '@/stores/game.store';
import { useAuthStore } from '@/stores/auth.store';
import { getSocket } from '@/services/socket';
import { api } from '@/services/api';
import type { Square } from '@chesskernel/shared';
import type { MoveBroadcastPayload, GameOverPayload } from '@chesskernel/shared';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
    gameState,
    chess,
    selectedSquare,
    myColor,
    isMyTurn,
    setGameState,
    applyMoveOptimistic,
    revertOptimistic,
    applyServerMove,
    updateClock,
    selectSquare,
    reset,
  } = useGameStore();

  useEffect(() => {
    if (!gameId || !user) return;

    api.get<any>(`/games/${gameId}`).then((game) => {
      setGameState(
        {
          id: game.id,
          white: game.white,
          black: game.black,
          status: game.status,
          result: game.result,
          termination: game.termination,
          timeControl: game.timeControl,
          timeControlConfig: { initialTimeMs: game.initialTimeMs, incrementMs: game.incrementMs, label: '', type: game.timeControl },
          fen: game.moves.length > 0 ? game.moves[game.moves.length - 1].fenAfter : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          pgn: game.pgn,
          moves: game.moves,
          clock: { white: game.initialTimeMs, black: game.initialTimeMs, activeColor: 'white', lastUpdatedAt: Date.now() },
          isBotGame: game.isBotGame,
          botDifficulty: game.botDifficulty,
          isCheck: false,
          isCheckmate: false,
          isStalemate: false,
          isDraw: false,
          drawOffer: null,
          startedAt: game.startedAt,
          endedAt: game.endedAt,
          createdAt: game.createdAt,
        },
        user.id,
      );
    });

    const socket = getSocket();
    socket.emit('game:spectate', { gameId });

    const handleMoveBroadcast = (payload: MoveBroadcastPayload) => {
      applyServerMove(payload.move, payload.fen, payload.clock);
    };

    const handleClock = (clock: any) => {
      updateClock(clock);
    };

    const handleGameOver = (payload: GameOverPayload) => {
      console.log('Game over:', payload);
    };

    socket.on('game:move:broadcast', handleMoveBroadcast);
    socket.on('game:clock', handleClock);
    socket.on('game:over', handleGameOver);

    return () => {
      socket.off('game:move:broadcast', handleMoveBroadcast);
      socket.off('game:clock', handleClock);
      socket.off('game:over', handleGameOver);
      socket.emit('game:leave', { gameId });
      reset();
    };
  }, [gameId, user]);

  const getLegalMoves = useCallback(
    (square: Square): Square[] => {
      if (!isMyTurn) return [];
      const moves = chess.moves({ square, verbose: true });
      return moves.map((m) => m.to as Square);
    },
    [chess, isMyTurn],
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!isMyTurn || !gameId) return;

      if (!selectedSquare) {
        const piece = chess.get(square);
        if (piece && piece.color === myColor?.[0]) {
          selectSquare(square);
        }
        return;
      }

      if (selectedSquare === square) {
        selectSquare(null);
        return;
      }

      const legalMoves = chess.moves({ square: selectedSquare as Square, verbose: true });
      const targetMove = legalMoves.find((m) => m.to === square);

      if (!targetMove) {
        const piece = chess.get(square);
        if (piece && piece.color === myColor?.[0]) {
          selectSquare(square);
        } else {
          selectSquare(null);
        }
        return;
      }

      const needsPromotion =
        targetMove.piece === 'p' &&
        ((myColor === 'white' && square[1] === '8') ||
          (myColor === 'black' && square[1] === '1'));

      if (needsPromotion) {
        // TODO: show promotion dialog
        sendMove(selectedSquare as Square, square, 'q');
      } else {
        sendMove(selectedSquare as Square, square);
      }

      selectSquare(null);
    },
    [selectedSquare, chess, isMyTurn, myColor, gameId],
  );

  const sendMove = (from: Square, to: Square, promotion?: string) => {
    if (!gameId) return;

    const previousFen = chess.fen();
    const success = applyMoveOptimistic(from, to, promotion);

    if (!success) return;

    const socket = getSocket();
    socket.emit('game:move', { gameId, from, to, promotion });

    socket.once('game:move:rejected', () => {
      revertOptimistic(previousFen);
    });
  };

  const handleResign = () => {
    if (!gameId) return;
    getSocket().emit('game:resign', { gameId });
  };

  const handleDrawOffer = () => {
    if (!gameId) return;
    getSocket().emit('game:draw:offer', { gameId });
  };

  if (!gameState) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading game…</div>;
  }

  const orientation = myColor ?? 'white';
  const lastMove = gameState.moves.length > 0
    ? { from: gameState.moves[gameState.moves.length - 1].uci.substring(0, 2) as Square, to: gameState.moves[gameState.moves.length - 1].uci.substring(2, 4) as Square }
    : null;

  const legalSquares = selectedSquare ? getLegalMoves(selectedSquare as Square) : [];

  return (
    <div className="flex gap-6 max-w-5xl mx-auto">
      <div className="flex-1 max-w-[600px]">
        <ChessBoard
          fen={gameState.fen}
          orientation={orientation}
          selectedSquare={selectedSquare as Square | null}
          legalMoves={legalSquares}
          lastMove={lastMove}
          isCheck={gameState.isCheck}
          onSquareClick={handleSquareClick}
          disabled={!isMyTurn || gameState.status !== 'active'}
        />
      </div>

      <div className="w-64 flex flex-col gap-4">
        <div className="bg-card border rounded-lg p-4 space-y-2">
          <div className="font-medium text-sm">
            {orientation === 'white' ? '♚ Black' : '♔ White'}
          </div>
          <div className="text-xs text-muted-foreground">
            {orientation === 'white' ? gameState.black?.username : gameState.white?.username}
          </div>
        </div>

        <ChessClock
          whiteMs={gameState.clock.white}
          blackMs={gameState.clock.black}
          activeColor={gameState.clock.activeColor}
          isGameActive={gameState.status === 'active'}
          orientation={orientation}
        />

        <div className="bg-card border rounded-lg p-4 space-y-2">
          <div className="font-medium text-sm">
            {orientation === 'white' ? '♔ White (You)' : '♚ Black (You)'}
          </div>
          <div className="text-xs text-muted-foreground">
            {orientation === 'white' ? gameState.white?.username : gameState.black?.username}
          </div>
        </div>

        {gameState.status === 'active' && myColor && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleDrawOffer}
              className="border px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              Offer Draw
            </button>
            <button
              onClick={handleResign}
              className="border border-destructive text-destructive px-3 py-2 rounded-md text-sm hover:bg-destructive/10 transition-colors"
            >
              Resign
            </button>
          </div>
        )}

        {gameState.status === 'ended' && (
          <div className="bg-muted rounded-lg p-4 text-center space-y-2">
            <div className="font-semibold">
              {gameState.result === 'draw' ? 'Draw' : gameState.result === myColor ? 'You Won!' : 'You Lost'}
            </div>
            <div className="text-sm text-muted-foreground capitalize">{gameState.termination?.replace(/_/g, ' ')}</div>
            <button
              onClick={() => navigate(`/analysis/${gameState.id}`)}
              className="text-primary text-sm hover:underline"
            >
              Analyze Game
            </button>
          </div>
        )}

        <div className="bg-card border rounded-lg p-4 max-h-48 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground mb-2">Moves</div>
          <div className="text-sm font-mono space-y-0.5">
            {gameState.moves.reduce<Array<{ n: number; w?: string; b?: string }>>(
              (acc, move) => {
                if (move.color === 'white') {
                  acc.push({ n: move.moveNumber, w: move.san });
                } else {
                  if (acc.length > 0) acc[acc.length - 1].b = move.san;
                }
                return acc;
              },
              [],
            ).map(({ n, w, b }) => (
              <div key={n} className="flex gap-2">
                <span className="text-muted-foreground w-6">{n}.</span>
                <span className="w-14">{w ?? ''}</span>
                <span className="w-14">{b ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
