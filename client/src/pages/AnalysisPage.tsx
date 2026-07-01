import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart2, Loader2 } from 'lucide-react';
import type { Arrow } from 'react-chessboard/dist/chessboard/types';
import { api } from '@/services/api';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { cn } from '@/lib/utils';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Chess.com classification metadata
const CLASSIFICATIONS: Record<string, { bg: string; text: string; badge: string; icon: string }> = {
  brilliant:  { bg: '#1baaa6', text: '#fff', badge: '!!', icon: '💎' },
  great:      { bg: '#5ba3b0', text: '#fff', badge: '!',  icon: '!' },
  best:       { bg: '#96bc4b', text: '#fff', badge: '★',  icon: '★' },
  excellent:  { bg: '#96bc4b', text: '#fff', badge: '✓',  icon: '✓' },
  good:       { bg: '#7d9c40', text: '#fff', badge: '',   icon: '' },
  book:       { bg: '#a88865', text: '#fff', badge: 'B',  icon: '📖' },
  inaccuracy: { bg: '#f0c648', text: '#222', badge: '?!', icon: '?!' },
  mistake:    { bg: '#e68b2c', text: '#fff', badge: '?',  icon: '?' },
  blunder:    { bg: '#ca3431', text: '#fff', badge: '??', icon: '??' },
  miss:       { bg: '#ca3431', text: '#fff', badge: '×',  icon: '×' },
};

const BADGE_CLASSES = new Set(['brilliant', 'great', 'book', 'inaccuracy', 'mistake', 'blunder', 'miss']);

function EvalBar({ cp, mate }: { cp: number | null; mate: number | null }) {
  const score = mate != null ? (mate > 0 ? 1200 : -1200) : (cp ?? 0);
  const clamped = Math.max(-600, Math.min(600, score));
  const whitePct = 50 + (clamped / 600) * 50;

  const label = mate != null
    ? `${mate > 0 ? '+' : '-'}M${Math.abs(mate)}`
    : cp != null
      ? `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(1)}`
      : '0.0';

  return (
    <div className="relative w-full h-full rounded overflow-hidden border border-border" style={{ backgroundColor: '#1a1a1a' }}>
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: `${whitePct}%`, backgroundColor: '#f0f0ee', transition: 'height 0.3s ease' }}
      />
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
        style={{ bottom: `${whitePct}%`, transform: 'translateY(50%)' }}
      >
        <span
          className="text-[8px] font-bold leading-none px-0.5 py-px rounded"
          style={{
            color: whitePct > 50 ? '#111' : '#f0f0ee',
            backgroundColor: whitePct > 50 ? 'rgba(240,240,238,0.92)' : 'rgba(26,26,26,0.88)',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function ClassBadge({ cls }: { cls: string }) {
  const meta = CLASSIFICATIONS[cls];
  if (!meta || !BADGE_CLASSES.has(cls)) return null;
  return (
    <span
      className="ml-0.5 inline-flex items-center justify-center text-[9px] font-black leading-none rounded px-0.5 min-w-[14px]"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      {meta.badge}
    </span>
  );
}

function NavBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/40 text-foreground transition-colors active:scale-95"
    >
      {children}
    </button>
  );
}

export function AnalysisPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const currentFen  = idx >= 0 ? (moves[idx]?.fenAfter ?? STARTING_FEN) : STARTING_FEN;
  const lastMove    = idx >= 0 ? { from: moves[idx]?.uci?.slice(0, 2) ?? '', to: moves[idx]?.uci?.slice(2, 4) ?? '' } : null;
  const curAnalysis = analysis?.status === 'completed' && idx >= 0 ? analysis.moveAnalyses?.[idx] : null;

  const evalCp: number | null = curAnalysis?.evalCentipawns ?? null;
  const mateIn: number | null = curAnalysis?.mateIn ?? null;
  const classification: string | undefined = curAnalysis?.classification;
  const bestMoveUci: string | null = curAnalysis?.bestMoveUci ?? null;

  const evalDisplay = mateIn != null
    ? `${mateIn > 0 ? '+' : '-'}M${Math.abs(mateIn)}`
    : evalCp != null
      ? `${evalCp >= 0 ? '+' : ''}${(evalCp / 100).toFixed(2)}`
      : null;

  const showBestArrow = bestMoveUci && classification && !['best', 'excellent', 'brilliant', 'great'].includes(classification);
  const customArrows: Arrow[] | undefined = showBestArrow && bestMoveUci
    ? [[bestMoveUci.slice(0, 2) as any, bestMoveUci.slice(2, 4) as any, 'rgba(0,190,100,0.85)']]
    : undefined;

  const go      = useCallback((d: number) => setIdx((i) => Math.max(-1, Math.min(totalMoves - 1, i + d))), [totalMoves]);
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
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <p className="font-semibold">{t('profile.notFound')}</p>
        <button onClick={() => navigate('/play')} className="text-primary hover:underline text-sm">← Back</button>
      </div>
    );
  }

  const white = game.white?.username ?? 'White';
  const black = game.black?.username ?? 'Black';

  type PairRow = { n: number; w?: { i: number; san: string; cls?: string }; b?: { i: number; san: string; cls?: string } };
  const pairRows = (moves as any[]).reduce<PairRow[]>((acc, move: any, i: number) => {
    const cls: string | undefined = analysis?.moveAnalyses?.[i]?.classification;
    if (move.color === 'white') {
      acc.push({ n: move.moveNumber as number, w: { i, san: move.san, cls } });
    } else if (acc.length > 0) {
      acc[acc.length - 1].b = { i, san: move.san, cls };
    }
    return acc;
  }, []);

  const classMeta = classification ? CLASSIFICATIONS[classification] : null;

  return (
    <div className="max-w-6xl mx-auto px-2 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-tight truncate">{white} vs {black}</h1>
          <p className="text-xs text-muted-foreground">{game.result ?? '—'} · {game.timeControl ?? t('analysis.title')}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Board column */}
        <div className="flex-1 min-w-0 space-y-3">
          {/*
            CSS GRID: eval bar column (10px) + board column (1fr) share one row.
            Row height = board height (aspect-square on 1fr width).
            Eval bar fills 100% height of the row automatically — no JS needed.
          */}
          <div style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: '8px', alignItems: 'stretch' }}>
            {/* Eval bar — h-full fills the shared grid row */}
            <div className="h-full">
              <EvalBar cp={evalCp} mate={mateIn} />
            </div>
            <ChessBoard
              fen={currentFen}
              orientation="white"
              selectedSquare={null}
              legalMoves={[]}
              lastMove={lastMove}
              isCheck={false}
              onSquareClick={() => {}}
              disabled
              moveClassification={classification}
              customArrows={customArrows}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-2">
            <NavBtn onClick={goFirst} title="First (Home)"><ChevronsLeft size={17} /></NavBtn>
            <NavBtn onClick={() => go(-1)} title="Previous (←)"><ChevronLeft size={17} /></NavBtn>
            <div className="min-w-[7rem] text-center px-3 py-1.5 rounded-lg border border-border bg-card text-sm">
              {idx >= 0
                ? <span className="font-semibold font-mono">{moves[idx]?.san}</span>
                : <span className="text-muted-foreground">{t('analysis.start')}</span>}
            </div>
            <NavBtn onClick={() => go(1)} title="Next (→)"><ChevronRight size={17} /></NavBtn>
            <NavBtn onClick={goLast} title="Last (End)"><ChevronsRight size={17} /></NavBtn>
          </div>
          <p className="text-center text-[11px] text-muted-foreground select-none">{t('analysis.arrowKeys')}</p>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          {/* Analysis info card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <BarChart2 size={14} className="text-primary shrink-0" />
              <span className="font-semibold text-sm">{t('analysis.title')}</span>
              {analysis?.status === 'completed' && (
                <span className="ml-auto text-xs font-medium" style={{ color: '#96bc4b' }}>{t('analysis.complete')}</span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {!analysis && !requestMutation.isPending && !requestMutation.isSuccess && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">Stockfish move-by-move evaluation.</p>
                  <button
                    onClick={() => requestMutation.mutate()}
                    className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    {t('analysis.requestAnalysis')}
                  </button>
                </div>
              )}

              {(requestMutation.isPending || (requestMutation.isSuccess && !['completed', 'failed'].includes(analysis?.status))) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                  <span>{requestMutation.isPending ? 'Starting…' : t('analysis.analyzing')}</span>
                </div>
              )}

              {analysis?.status === 'failed' && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-destructive">{t('analysis.failed')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('analysis.failedHint')}</p>
                  <code className="block bg-muted rounded px-2 py-1.5 text-xs font-mono">sudo apt install stockfish</code>
                </div>
              )}

              {analysis?.status === 'completed' && (
                <div className="space-y-2.5">
                  {classMeta ? (
                    <div
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
                      style={{ backgroundColor: classMeta.bg + '22' }}
                    >
                      <span className="text-lg leading-none">{classMeta.icon}</span>
                      <span className="font-bold capitalize text-sm" style={{ color: classMeta.bg }}>{classification}</span>
                      {classMeta.badge && (
                        <span
                          className="ml-auto text-xs font-black px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: classMeta.bg, color: classMeta.text }}
                        >
                          {classMeta.badge}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{idx < 0 ? t('analysis.selectMove') : 'No data for this move'}</p>
                  )}

                  {evalDisplay && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('analysis.evaluation')}</span>
                      <span className={cn('font-bold tabular-nums font-mono', (evalCp ?? 0) > 50 ? 'text-green-500' : (evalCp ?? 0) < -50 ? 'text-red-400' : 'text-foreground')}>
                        {evalDisplay}
                      </span>
                    </div>
                  )}

                  {bestMoveUci && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('analysis.bestMove')}</span>
                      <span className="font-mono font-bold text-primary">{bestMoveUci}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Move list */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <span className="font-semibold text-sm">{t('analysis.moves')}</span>
              <span className="text-xs text-muted-foreground">({totalMoves})</span>
            </div>
            <div className="max-h-72 overflow-y-auto overscroll-contain">
              {pairRows.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">{t('analysis.noMoves')}</p>
              ) : (
                <div className="py-1">
                  {pairRows.map(({ n, w, b }: PairRow) => (
                    <div key={n} className="flex items-center">
                      <span className="text-muted-foreground pl-3 pr-1 py-0.5 shrink-0 text-xs w-9 text-right font-mono">{n}.</span>
                      {w ? (
                        <button
                          onClick={() => setIdx(w.i)}
                          className={cn(
                            'flex items-center w-[4.5rem] text-left px-1.5 py-0.5 rounded text-xs font-mono',
                            idx === w.i ? 'bg-primary/20 text-primary font-semibold' : 'hover:bg-muted',
                          )}
                        >
                          <span className="truncate">{w.san}</span>
                          {w.cls && <ClassBadge cls={w.cls} />}
                        </button>
                      ) : <span className="w-[4.5rem]" />}
                      {b ? (
                        <button
                          onClick={() => setIdx(b.i)}
                          className={cn(
                            'flex items-center w-[4.5rem] text-left px-1.5 py-0.5 rounded text-xs font-mono',
                            idx === b.i ? 'bg-primary/20 text-primary font-semibold' : 'hover:bg-muted',
                          )}
                        >
                          <span className="truncate">{b.san}</span>
                          {b.cls && <ClassBadge cls={b.cls} />}
                        </button>
                      ) : <span className="w-[4.5rem]" />}
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
