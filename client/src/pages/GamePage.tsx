import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { ChessClock } from '@/components/chess/ChessClock';
import { useGameStore } from '@/stores/game.store';
import { useAuthStore } from '@/stores/auth.store';
import { getSocket } from '@/services/socket';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import type { Square, GameOverPayload, MoveBroadcastPayload } from '@chesskernel/shared';

type Sq = string;

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [drawOffered, setDrawOffered] = useState<'white' | 'black' | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [illegalFlash, setIllegalFlash] = useState(false);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    gameState, chess, selectedSquare, myColor, isMyTurn,
    setGameState, applyMoveOptimistic, revertOptimistic,
    applyServerMove, updateClock, selectSquare, reset,
  } = useGameStore();

  useEffect(() => {
    if (!gameId || !user) return;

    api.get<any>(`/games/${gameId}`).then((game) => {
      const lastFen = game.moves.length > 0
        ? game.moves[game.moves.length - 1].fenAfter
        : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      setGameState({
        id: game.id,
        white: game.white,
        black: game.black,
        status: game.status,
        result: game.result,
        termination: game.termination,
        timeControl: game.timeControl,
        timeControlConfig: { initialTimeMs: game.initialTimeMs, incrementMs: game.incrementMs, label: '', type: game.timeControl },
        fen: lastFen,
        pgn: game.pgn,
        moves: game.moves,
        clock: { white: game.initialTimeMs, black: game.initialTimeMs, activeColor: 'white', lastUpdatedAt: Date.now() },
        isBotGame: game.isBotGame,
        botDifficulty: game.botDifficulty,
        isCheck: false, isCheckmate: false, isStalemate: false, isDraw: false,
        drawOffer: null, startedAt: game.startedAt, endedAt: game.endedAt, createdAt: game.createdAt,
      }, user.id);
      if (game.status === 'ended') {
        setGameOver({ result: game.result, termination: game.termination, winner: game.result === 'draw' ? null : game.result, whiteRatingDelta: null, blackRatingDelta: null, pgn: game.pgn ?? '' });
      }
    });

    const socket = getSocket();
    socket.emit('game:spectate', { gameId });

    const onMove = (p: MoveBroadcastPayload) => { applyServerMove(p.move, p.fen, p.clock); };
    const onClock = (c: any) => { updateClock(c); };
    const onOver = (p: GameOverPayload) => { setGameOver(p); };
    const onDrawOffered = ({ byColor }: { byColor: 'white' | 'black' }) => { setDrawOffered(byColor); };
    const onDrawDeclined = () => { setDrawOffered(null); };

    socket.on('game:move:broadcast', onMove);
    socket.on('game:clock', onClock);
    socket.on('game:over', onOver);
    socket.on('game:draw:offered', onDrawOffered);
    socket.on('game:draw:declined', onDrawDeclined);

    return () => {
      socket.off('game:move:broadcast', onMove);
      socket.off('game:clock', onClock);
      socket.off('game:over', onOver);
      socket.off('game:draw:offered', onDrawOffered);
      socket.off('game:draw:declined', onDrawDeclined);
      socket.emit('game:leave', { gameId });
      reset();
    };
  }, [gameId, user]);

  const getLegalMoves = useCallback((sq: Sq): string[] => {
    if (!isMyTurn) return [];
    return chess.moves({ square: sq as Square, verbose: true }).map((m) => m.to as string);
  }, [chess, isMyTurn]);

  const triggerIllegalFlash = useCallback(() => {
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    setIllegalFlash(true);
    flashTimeout.current = setTimeout(() => setIllegalFlash(false), 400);
  }, []);

  const sendMove = useCallback((from: Sq, to: Sq, promotion?: string) => {
    if (!gameId) return;
    const prevFen = chess.fen();
    const ok = applyMoveOptimistic(from as Square, to as Square, promotion);
    if (!ok) { triggerIllegalFlash(); return; }
    const socket = getSocket();
    socket.emit('game:move', { gameId, from, to, promotion });
    socket.once('game:move:rejected', () => revertOptimistic(prevFen));
  }, [gameId, chess, applyMoveOptimistic, revertOptimistic, triggerIllegalFlash]);

  const handleSquareClick = useCallback((sq: Sq) => {
    if (!isMyTurn || !gameId) return;
    if (!selectedSquare) {
      const piece = chess.get(sq as Square);
      if (piece && piece.color === myColor?.[0]) selectSquare(sq as Square);
      return;
    }
    if (selectedSquare === sq) { selectSquare(null); return; }
    const legalMoves = chess.moves({ square: selectedSquare as Square, verbose: true });
    const target = legalMoves.find((m) => m.to === sq);
    if (!target) {
      const piece = chess.get(sq as Square);
      selectSquare(piece && piece.color === myColor?.[0] ? sq as Square : null);
      return;
    }
    const needsPromo = target.piece === 'p' && ((myColor === 'white' && sq[1] === '8') || (myColor === 'black' && sq[1] === '1'));
    sendMove(selectedSquare as Sq, sq, needsPromo ? 'q' : undefined);
    selectSquare(null);
  }, [selectedSquare, chess, isMyTurn, myColor, gameId, sendMove]);

  const handleDrop = useCallback((from: Sq, to: Sq): boolean => {
    if (!isMyTurn || !gameId) { triggerIllegalFlash(); return false; }
    const legalMoves = chess.moves({ square: from as Square, verbose: true });
    const target = legalMoves.find((m) => m.to === to);
    if (!target) { triggerIllegalFlash(); return false; }
    const needsPromo = target.piece === 'p' && ((myColor === 'white' && to[1] === '8') || (myColor === 'black' && to[1] === '1'));
    sendMove(from, to, needsPromo ? 'q' : undefined);
    selectSquare(null);
    return true;
  }, [chess, isMyTurn, myColor, gameId, sendMove, triggerIllegalFlash]);

  const handleResign = () => { if (gameId) getSocket().emit('game:resign', { gameId }); };
  const handleDrawOffer = () => { if (gameId) getSocket().emit('game:draw:offer', { gameId }); };
  const handleDrawAccept = () => { if (gameId) { getSocket().emit('game:draw:accept', { gameId }); setDrawOffered(null); } };
  const handleDrawDecline = () => { if (gameId) { getSocket().emit('game:draw:decline', { gameId }); setDrawOffered(null); } };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{t('game.loading')}</span>
        </div>
      </div>
    );
  }

  const orientation = myColor ?? 'white';
  const lastMove = gameState.moves.length > 0
    ? { from: gameState.moves.at(-1)!.uci.substring(0, 2), to: gameState.moves.at(-1)!.uci.substring(2, 4) }
    : null;
  const legalSquares = selectedSquare ? getLegalMoves(selectedSquare as Sq) : [];
  const isActive = gameState.status === 'active' && !gameOver;

  const opponent = orientation === 'white' ? gameState.black : gameState.white;
  const self = orientation === 'white' ? gameState.white : gameState.black;

  const drawIsFromOpponent = drawOffered !== null && drawOffered !== myColor;

  return (
    <div className="flex flex-col lg:flex-row gap-4 max-w-6xl mx-auto px-2">
      {/* Board column */}
      <div className="flex-1 min-w-0 max-w-[680px] mx-auto lg:mx-0">
        {/* Opponent info */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className={cn('w-5 h-5 rounded-full border border-border', orientation === 'black' ? 'bg-white' : 'bg-gray-900')} />
            <span className="font-semibold text-sm">{opponent?.username ?? 'Stockfish'}</span>
          </div>
        </div>

        <ChessBoard
          key={gameState.moves.length}
          fen={gameState.fen}
          orientation={orientation}
          selectedSquare={selectedSquare as Square | null}
          legalMoves={legalSquares}
          lastMove={lastMove}
          isCheck={gameState.isCheck}
          onSquareClick={handleSquareClick}
          onDrop={handleDrop}
          disabled={!isActive || !isMyTurn}
          illegalFlash={illegalFlash}
        />

        {/* Player info */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-2">
            <div className={cn('w-5 h-5 rounded-full border border-border', orientation === 'white' ? 'bg-white' : 'bg-gray-900 dark:bg-gray-100')} />
            <span className="font-semibold text-sm">{self?.username ?? t('game.you')}</span>
          </div>
          {myColor && (
            <span className="text-xs text-muted-foreground capitalize">
              {orientation === 'white' ? '♔' : '♚'} {orientation}
            </span>
          )}
        </div>
      </div>

      {/* Side panel */}
      <div className="w-full lg:w-64 flex flex-col gap-3">
        {/* Clock */}
        <ChessClock
          whiteMs={gameState.clock.white}
          blackMs={gameState.clock.black}
          activeColor={gameState.clock.activeColor}
          isGameActive={isActive}
          orientation={orientation}
          playerName={{ top: opponent?.username ?? 'Stockfish', bottom: self?.username ?? 'You' }}
        />

        {/* Draw offer banner */}
        {drawIsFromOpponent && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{t('game.drawOffered')}</p>
            <div className="flex gap-2">
              <button onClick={handleDrawAccept} className="flex-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors">
                {t('game.accept')}
              </button>
              <button onClick={handleDrawDecline} className="flex-1 border border-border text-sm px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
                {t('game.decline')}
              </button>
            </div>
          </div>
        )}

        {/* Game over card */}
        {gameOver && (
          <div className="bg-card border rounded-lg p-4 text-center space-y-2">
            <div className="text-lg font-bold">
              {gameOver.result === 'draw'
                ? t('game.draw')
                : gameOver.result === myColor
                  ? t('game.youWon')
                  : t('game.youLost')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t(`game.terminations.${gameOver.termination}` as any)}
            </div>
            {gameOver.whiteRatingDelta != null && (
              <div className="text-xs text-muted-foreground">
                {myColor === 'white'
                  ? (gameOver.whiteRatingDelta >= 0 ? '+' : '') + gameOver.whiteRatingDelta
                  : (gameOver.blackRatingDelta ?? 0) >= 0
                    ? `+${gameOver.blackRatingDelta}`
                    : gameOver.blackRatingDelta
                } rating
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => navigate(`/analysis/${gameId}`)} className="flex-1 text-primary text-sm hover:underline">
                {t('game.analyzeGame')}
              </button>
              <button onClick={() => navigate('/play')} className="flex-1 bg-primary text-primary-foreground text-sm px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors">
                {t('game.newGame')}
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        {isActive && myColor && (
          <div className="flex gap-2">
            <button
              onClick={handleDrawOffer}
              className="flex-1 text-sm border border-border px-3 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
            >
              ½ {t('game.offerDraw')}
            </button>
            <button
              onClick={handleResign}
              className="flex-1 text-sm border border-destructive/50 text-destructive px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors font-medium"
            >
              🏳 {t('game.resign')}
            </button>
          </div>
        )}

        {/* Move list */}
        <div className="bg-card border rounded-lg flex flex-col flex-1 min-h-0">
          <div className="text-xs font-semibold text-muted-foreground px-3 pt-3 pb-1.5 border-b">{t('game.moves')}</div>
          <div className="overflow-y-auto flex-1 px-2 py-2 max-h-60">
            <div className="text-sm font-mono space-y-0.5">
              {gameState.moves.reduce<Array<{ n: number; w?: string; b?: string }>>((acc, move) => {
                if (move.color === 'white') acc.push({ n: move.moveNumber, w: move.san });
                else if (acc.length > 0) acc[acc.length - 1].b = move.san;
                return acc;
              }, []).map(({ n, w, b }) => (
                <div key={n} className="flex gap-1 hover:bg-muted/60 rounded px-1 py-0.5">
                  <span className="text-muted-foreground w-6 text-right shrink-0">{n}.</span>
                  <span className="w-14">{w ?? ''}</span>
                  <span className="w-14 text-muted-foreground">{b ?? ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
