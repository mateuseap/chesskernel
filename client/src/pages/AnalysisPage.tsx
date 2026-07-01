import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart2, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { cn } from '@/lib/utils';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const CLASSIFICATION_META: Record<string, { color: string; icon: string }> = {
  best:       { color: 'text-green-500',  icon: '★' },
  excellent:  { color: 'text-green-400',  icon: '✓' },
  good:       { color: 'text-blue-400',   icon: '·' },
  book:       { color: 'text-slate-400',  icon: '📖' },
  inaccuracy: { color: 'text-yellow-400', icon: '?!' },
  mistake:    { color: 'text-orange-400', icon: '?' },
  blunder:    { color: 'text-red-400',    icon: '??' },
};

function EvalBar({ cp, mate }: { cp: number | null; mate: number | null }) {
  const score = mate != null ? (mate > 0 ? 1000 : -1000) : (cp ?? 0);
  const clamped = Math.max(-600, Math.min(600, score));
  const whitePct = 50 + (clamped / 600) * 50;

  const label = mate != null
    ? (mate > 0 ? `+M${Math.abs(mate)}` : `-M${Math.abs(mate)}`)
    : cp != null ? (cp >= 0 ? `+${(cp / 100).toFixed(1)}` : `${(cp / 100).toFixed(1)}`) : '0.0';

  return (
    <div className="relative w-3 rounded overflow-hidden bg-gray-800 h-full" title={label}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-gray-100 transition-all duration-300"
        style={{ height: `${whitePct}%` }}
      />
    </div>
  );
}

function NavBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/40 text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

function MoveButton({ san, cls, active, onClick }: { san: string; cls?: string; active: boolean; onClick: () => void }) {
  const meta = cls ? CLASSIFICATION_META[cls] : null;
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-16 text-left px-2 py-1 rounded text-sm font-mono transition-colors',
        active ? 'bg-primary/20 text-primary font-semibold' : 'hover:bg-muted',
        !active && meta?.color,
      )}
    >
      {san}{meta ? <sup className="ml-0.5 text-[9px]">{meta.icon}</sup> : null}
    </button>
  );
}

export function AnalysisPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  useTranslation(); // ensure re-render on language change
  const [idx, setIdx] = useState<number>(-1);

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => api.get<any>(`/games/${gameId}`),
    enabled: !!gameId,
  });

  const { data: analysis, refetch: refetchAnalysis } = useQuery({
    queryKey: ['analysis', gameId],
    queryFn: () => api.get<any>(`/analysis/${gameId}`),
    enabled: !!gameId,
    retry: false,
  });

  const requestMutation = useMutation({
    mutationFn: () => api.post<any>('/analysis', { gameId }),
    onSuccess: () => {
      const poll = setInterval(async () => {
        const res = await refetchAnalysis();
        if (res.data?.status === 'completed' || res.data?.status === 'failed') {
          clearInterval(poll);
        }
      }, 2000);
    },
  });

  const moves = game?.moves ?? [];
  const totalMoves = moves.length;

  const currentFen = idx >= 0 && idx < totalMoves ? moves[idx].fenAfter : STARTING_FEN;
  const lastMove = idx >= 0 && idx < totalMoves
    ? { from: moves[idx].uci.substring(0, 2), to: moves[idx].uci.substring(2, 4) }
    : null;

  const currentAnalysis = analysis?.status === 'completed' && idx >= 0
    ? analysis.moveAnalyses?.[idx]
    : null;

  const evalCp: number | null = currentAnalysis?.evalCentipawns ?? null;
  const mateIn: number | null = currentAnalysis?.mateIn ?? null;

  const evalDisplay = mateIn != null
    ? `${mateIn > 0 ? '+' : '-'}M${Math.abs(mateIn)}`
    : evalCp != null
      ? (evalCp >= 0 ? `+${(evalCp / 100).toFixed(2)}` : `${(evalCp / 100).toFixed(2)}`)
      : null;

  const go = useCallback((delta: number) => {
    setIdx((i) => Math.max(-1, Math.min(totalMoves - 1, i + delta)));
  }, [totalMoves]);

  const goFirst = useCallback(() => setIdx(-1), []);
  const goLast  = useCallback(() => setIdx(totalMoves - 1), [totalMoves]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'Home')       { e.preventDefault(); goFirst(); }
      if (e.key === 'End')        { e.preventDefault(); goLast(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go, goFirst, goLast]);

  if (gameLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <p className="text-lg font-semibold">Game not found</p>
        <button onClick={() => navigate('/play')} className="text-primary hover:underline text-sm">
          Back to Play
        </button>
      </div>
    );
  }

  const white = game.white?.username ?? 'White';
  const black = game.black?.username ?? 'Black';

  type PairRow = { n: number; w?: { i: number; san: string; cls?: string }; b?: { i: number; san: string; cls?: string } };
  const pairRows = (moves as any[]).reduce<PairRow[]>(
    (acc: PairRow[], move: any, i: number) => {
      const cls: string | undefined = analysis?.moveAnalyses?.[i]?.classification;
      if (move.color === 'white') {
        acc.push({ n: move.moveNumber as number, w: { i, san: move.san as string, cls } });
      } else if (acc.length > 0) {
        acc[acc.length - 1].b = { i, san: move.san as string, cls };
      }
      return acc;
    },
    [],
  );

  return (
    <div className="max-w-6xl mx-auto px-2 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-lg leading-tight">{white} vs {black}</h1>
          <p className="text-xs text-muted-foreground">
            {game.result ?? '—'} · {game.timeControl ?? 'Analysis'}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Board column */}
        <div className="flex gap-2 flex-1 min-w-0">
          {/* Eval bar */}
          <div className="w-3 self-stretch min-h-[300px]">
            <EvalBar cp={evalCp} mate={mateIn} />
          </div>

          <div className="flex-1 min-w-0">
            <ChessBoard
              fen={currentFen}
              orientation="white"
              selectedSquare={null}
              legalMoves={[]}
              lastMove={lastMove}
              isCheck={false}
              onSquareClick={() => {}}
              disabled
            />

            {/* Navigation controls */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <NavBtn onClick={goFirst} title="First (Home)">
                <ChevronsLeft size={18} />
              </NavBtn>
              <NavBtn onClick={() => go(-1)} title="Previous (←)">
                <ChevronLeft size={18} />
              </NavBtn>

              <div className="w-28 text-center text-sm text-muted-foreground tabular-nums">
                {idx >= 0
                  ? <span className="font-medium text-foreground">{moves[idx]?.san}</span>
                  : <span>Start</span>}
              </div>

              <NavBtn onClick={() => go(1)} title="Next (→)">
                <ChevronRight size={18} />
              </NavBtn>
              <NavBtn onClick={goLast} title="Last (End)">
                <ChevronsRight size={18} />
              </NavBtn>
            </div>

            <p className="text-center text-[11px] text-muted-foreground mt-1.5 select-none">
              Use ← → arrow keys to navigate
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          {/* Analysis card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <BarChart2 size={15} className="text-primary" />
              <span className="font-semibold text-sm">Analysis</span>
              {analysis?.status === 'completed' && (
                <span className="ml-auto text-xs text-green-500 font-medium">Complete</span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {!analysis && !requestMutation.isPending && !requestMutation.isSuccess && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Get move-by-move evaluation powered by Stockfish.
                  </p>
                  <button
                    onClick={() => requestMutation.mutate()}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Analyze Game
                  </button>
                </div>
              )}

              {(requestMutation.isPending || requestMutation.isSuccess) && analysis?.status !== 'completed' && analysis?.status !== 'failed' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <Loader2 size={14} className="animate-spin text-primary shrink-0" />
                  <span>
                    {requestMutation.isPending ? 'Starting analysis…' : 'Analyzing with Stockfish…'}
                  </span>
                </div>
              )}

              {analysis?.status === 'failed' && (
                <div className="space-y-2 text-sm">
                  <p className="text-destructive font-medium">Analysis failed</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Stockfish is not installed on the server. Ask the server admin to run:
                  </p>
                  <code className="block bg-muted rounded px-2 py-1.5 text-xs text-foreground">
                    sudo apt-get install stockfish
                  </code>
                </div>
              )}

              {analysis?.status === 'completed' && (
                <div className="space-y-2">
                  {currentAnalysis ? (
                    <>
                      {evalDisplay && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Evaluation</span>
                          <span className={cn(
                            'font-bold tabular-nums',
                            (evalCp ?? 0) > 0 ? 'text-green-400' : (evalCp ?? 0) < 0 ? 'text-red-400' : 'text-foreground',
                          )}>
                            {evalDisplay}
                          </span>
                        </div>
                      )}

                      {currentAnalysis.bestMoveUci && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Best move</span>
                          <span className="font-mono font-semibold text-primary">
                            {currentAnalysis.bestMoveUci}
                          </span>
                        </div>
                      )}

                      {currentAnalysis.classification && (
                        <div className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold capitalize bg-muted/60',
                          CLASSIFICATION_META[currentAnalysis.classification]?.color,
                        )}>
                          <span>{CLASSIFICATION_META[currentAnalysis.classification]?.icon}</span>
                          <span>{currentAnalysis.classification}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground py-1">
                      {idx < 0 ? 'Navigate through moves to see evaluation' : 'No analysis for this move'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Move list */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <span className="font-semibold text-sm">Moves</span>
              <span className="ml-2 text-xs text-muted-foreground">{totalMoves} total</span>
            </div>

            <div className="max-h-72 overflow-y-auto overscroll-contain">
              {pairRows.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">No moves recorded</p>
              ) : (
                <div className="py-1 font-mono">
                  {pairRows.map(({ n, w, b }: PairRow) => (
                    <div key={n} className="flex items-center text-sm">
                      <span className="text-muted-foreground pl-3 pr-1 py-0.5 shrink-0 text-xs w-9 text-right">{n}.</span>
                      {w ? (
                        <MoveButton san={w.san} cls={w.cls} active={idx === w.i} onClick={() => setIdx(w.i)} />
                      ) : <span className="w-16" />}
                      {b ? (
                        <MoveButton san={b.san} cls={b.cls} active={idx === b.i} onClick={() => setIdx(b.i)} />
                      ) : <span className="w-16" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
