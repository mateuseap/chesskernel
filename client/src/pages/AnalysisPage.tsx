import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import { ChessBoard } from '@/components/chess/ChessBoard';
import type { Square } from '@chesskernel/shared';

const CLASSIFICATION_COLORS: Record<string, string> = {
  best: 'text-green-600',
  excellent: 'text-green-500',
  good: 'text-blue-500',
  book: 'text-muted-foreground',
  inaccuracy: 'text-yellow-500',
  mistake: 'text-orange-500',
  blunder: 'text-red-600',
};

export function AnalysisPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [currentMoveIdx, setCurrentMoveIdx] = useState<number>(-1);

  const { data: game } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => api.get<any>(`/games/${gameId}`),
  });

  const { data: analysis, refetch: refetchAnalysis } = useQuery({
    queryKey: ['analysis', gameId],
    queryFn: () => api.get<any>(`/analysis/${gameId}`),
    retry: false,
  });

  const requestAnalysisMutation = useMutation({
    mutationFn: () => api.post('/analysis', { gameId }),
    onSuccess: () => {
      const poll = setInterval(async () => {
        const result = await refetchAnalysis();
        if (result.data?.status === 'completed') {
          clearInterval(poll);
        }
      }, 2000);
    },
  });

  if (!game) {
    return <div className="text-center text-muted-foreground mt-16">Loading game…</div>;
  }

  const moves = game.moves ?? [];
  const currentFen =
    currentMoveIdx >= 0 && currentMoveIdx < moves.length
      ? moves[currentMoveIdx].fenAfter
      : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  return (
    <div className="flex gap-6 max-w-5xl mx-auto">
      <div className="flex-1 max-w-[500px]">
        <ChessBoard
          fen={currentFen}
          orientation="white"
          selectedSquare={null}
          legalMoves={[]}
          lastMove={
            currentMoveIdx >= 0
              ? {
                  from: moves[currentMoveIdx].uci.substring(0, 2) as Square,
                  to: moves[currentMoveIdx].uci.substring(2, 4) as Square,
                }
              : null
          }
          isCheck={false}
          onSquareClick={() => {}}
          disabled
        />

        <div className="flex gap-2 mt-4 justify-center">
          <button
            onClick={() => setCurrentMoveIdx(-1)}
            className="px-3 py-1.5 border rounded hover:bg-muted text-sm"
          >
            |◀
          </button>
          <button
            onClick={() => setCurrentMoveIdx((i) => Math.max(-1, i - 1))}
            className="px-3 py-1.5 border rounded hover:bg-muted text-sm"
          >
            ◀
          </button>
          <button
            onClick={() => setCurrentMoveIdx((i) => Math.min(moves.length - 1, i + 1))}
            className="px-3 py-1.5 border rounded hover:bg-muted text-sm"
          >
            ▶
          </button>
          <button
            onClick={() => setCurrentMoveIdx(moves.length - 1)}
            className="px-3 py-1.5 border rounded hover:bg-muted text-sm"
          >
            ▶|
          </button>
        </div>
      </div>

      <div className="w-80 space-y-4">
        <div className="bg-card border rounded-lg p-4 space-y-2">
          <div className="font-semibold">Analysis</div>
          {!analysis && (
            <button
              onClick={() => requestAnalysisMutation.mutate()}
              disabled={requestAnalysisMutation.isPending}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {requestAnalysisMutation.isPending ? 'Requesting…' : 'Request Analysis'}
            </button>
          )}
          {analysis?.status === 'processing' && (
            <p className="text-sm text-muted-foreground animate-pulse">Analyzing with Stockfish…</p>
          )}
          {analysis?.status === 'completed' && currentMoveIdx >= 0 && (
            <div className="space-y-1">
              {analysis.moveAnalyses[currentMoveIdx] && (
                <>
                  <div className={`font-medium capitalize ${CLASSIFICATION_COLORS[analysis.moveAnalyses[currentMoveIdx].classification] ?? ''}`}>
                    {analysis.moveAnalyses[currentMoveIdx].classification}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Eval: {analysis.moveAnalyses[currentMoveIdx].evalCentipawns !== null
                      ? `${(analysis.moveAnalyses[currentMoveIdx].evalCentipawns / 100).toFixed(2)}`
                      : `M${analysis.moveAnalyses[currentMoveIdx].mateIn}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Best: {analysis.moveAnalyses[currentMoveIdx].bestMoveUci}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-lg p-4 max-h-96 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground mb-2">Moves</div>
          <div className="space-y-0.5">
            {moves.reduce<Array<{ n: number; w?: { idx: number; san: string; cls?: string }; b?: { idx: number; san: string; cls?: string } }>>(
              (acc, move, idx) => {
                const cls = analysis?.moveAnalyses?.[idx]?.classification;
                if (move.color === 'white') {
                  acc.push({ n: move.moveNumber, w: { idx, san: move.san, cls } });
                } else {
                  if (acc.length > 0) acc[acc.length - 1].b = { idx, san: move.san, cls };
                }
                return acc;
              },
              [],
            ).map(({ n, w, b }) => (
              <div key={n} className="flex gap-2 text-sm font-mono">
                <span className="text-muted-foreground w-6">{n}.</span>
                {w && (
                  <button
                    onClick={() => setCurrentMoveIdx(w.idx)}
                    className={`w-14 text-left px-1 rounded hover:bg-muted ${currentMoveIdx === w.idx ? 'bg-primary/20' : ''} ${w.cls ? CLASSIFICATION_COLORS[w.cls] : ''}`}
                  >
                    {w.san}
                  </button>
                )}
                {b && (
                  <button
                    onClick={() => setCurrentMoveIdx(b.idx)}
                    className={`w-14 text-left px-1 rounded hover:bg-muted ${currentMoveIdx === b.idx ? 'bg-primary/20' : ''} ${b.cls ? CLASSIFICATION_COLORS[b.cls] : ''}`}
                  >
                    {b.san}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
