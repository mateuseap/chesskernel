import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart2, Loader2 } from 'lucide-react';
import type { Arrow } from 'react-chessboard/dist/chessboard/types';
import { api } from '@/services/api';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { cn } from '@/lib/utils';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Chess.com exact classification system
const CLS: Record<string, { bg: string; text: string; badge: string; icon: string; sqColor: string }> = {
  brilliant:  { bg: '#1baaa6', text: '#fff', badge: '!!', icon: '💎', sqColor: 'rgba(27,170,166,0.55)' },
  great:      { bg: '#5ba3b0', text: '#fff', badge: '!',  icon: '!',  sqColor: 'rgba(91,163,176,0.55)' },
  best:       { bg: '#96bc4b', text: '#fff', badge: '★',  icon: '★',  sqColor: 'rgba(150,188,75,0.50)' },
  excellent:  { bg: '#96bc4b', text: '#fff', badge: '✓',  icon: '✓',  sqColor: 'rgba(150,188,75,0.40)' },
  good:       { bg: '#7d9c40', text: '#fff', badge: '',   icon: '',   sqColor: 'rgba(150,188,75,0.28)' },
  book:       { bg: '#a88865', text: '#fff', badge: 'B',  icon: '📖', sqColor: 'rgba(168,136,101,0.55)' },
  inaccuracy: { bg: '#f0c648', text: '#222', badge: '?!', icon: '?!', sqColor: 'rgba(240,198,72,0.55)' },
  mistake:    { bg: '#e68b2c', text: '#fff', badge: '?',  icon: '?',  sqColor: 'rgba(230,139,44,0.55)' },
  blunder:    { bg: '#ca3431', text: '#fff', badge: '??', icon: '??', sqColor: 'rgba(202,52,49,0.55)' },
  miss:       { bg: '#ca3431', text: '#fff', badge: '×',  icon: '×',  sqColor: 'rgba(202,52,49,0.45)' },
};

// Small badge shown INSIDE the move button (to the right of SAN)
function InlineBadge({ cls }: { cls?: string }) {
  if (!cls) return null;
  const meta = CLS[cls];
  if (!meta || !meta.badge) return null;
  return (
    <span
      className="ml-1 inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: 16,
        height: 16,
        backgroundColor: meta.bg,
        color: meta.text,
        fontSize: 6.5,
        fontWeight: 900,
        lineHeight: 1,
      }}
    >
      {meta.badge}
    </span>
  );
}

// Chess.com-style move button
function MoveBtn({
  san, cls, active, onClick, refEl,
}: {
  san: string; cls?: string; active: boolean; onClick: () => void; refEl?: (el: HTMLButtonElement | null) => void;
}) {
  const meta = cls ? CLS[cls] : null;

  return (
    <button
      ref={refEl}
      onClick={onClick}
      className={cn(
        'flex items-center h-8 px-2 rounded text-sm font-mono transition-all shrink-0',
        active
          ? 'font-semibold text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
      )}
      style={active && meta
        ? { backgroundColor: meta.bg + '28', color: 'inherit' }
        : active
          ? { backgroundColor: 'hsl(var(--muted))' }
          : undefined}
    >
      <span>{san}</span>
      <InlineBadge cls={cls} />
    </button>
  );
}

function EvalBar({ cp, mate }: { cp: number | null; mate: number | null }) {
  const raw = mate != null ? (mate > 0 ? 900 : -900) : (cp ?? 0);
  const clamped = Math.max(-900, Math.min(900, raw));
  const whitePct = 50 + (clamped / 900) * 50;
  const whiteWinning = clamped >= 0;

  const label = mate != null
    ? `M${Math.abs(mate)}`
    : `${Math.abs((cp ?? 0) / 100).toFixed(1)}`;

  return (
    <div
      className="relative w-full h-full rounded-sm overflow-hidden"
      style={{ backgroundColor: '#262421' }}
    >
      {/* White portion */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${whitePct}%`,
          backgroundColor: '#f0ede0',
          transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Score label — solid pill pinned to the far end of the winning side */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
        style={whiteWinning ? { bottom: 4 } : { top: 4 }}
      >
        <span
          style={{
            display: 'block',
            // Contrast: white wins → dark text on cream bg; black wins → light text on dark bg
            color:           whiteWinning ? '#1a1a18' : '#f0ede0',
            backgroundColor: whiteWinning ? '#dbd8cc' : '#3a3734',
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            padding: '2px 4px',
            borderRadius: 3,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function NavBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-9 h-9 flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
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
  const moveListRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

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
        if (res.data?.status === 'completed' || res.data?.status === 'failed') clearInterval(poll);
      }, 2000);
    },
  });

  const moves = game?.moves ?? [];
  const totalMoves = moves.length;

  const currentFen  = idx >= 0 ? (moves[idx]?.fenAfter ?? STARTING_FEN) : STARTING_FEN;
  const lastMove    = idx >= 0 ? { from: moves[idx]?.uci?.slice(0, 2) ?? '', to: moves[idx]?.uci?.slice(2, 4) ?? '' } : null;
  const curAnalysis = analysis?.status === 'completed' && idx >= 0 ? analysis.moveAnalyses?.[idx] : null;

  const evalCp: number | null     = curAnalysis?.evalCentipawns ?? null;
  const mateIn: number | null     = curAnalysis?.mateIn ?? null;
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

  // Auto-scroll active move into view
  useEffect(() => {
    if (activeBtnRef.current && moveListRef.current) {
      activeBtnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [idx]);

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

  // Build move rows: each row = { moveNumber, white?: MoveEntry, black?: MoveEntry }
  type MoveEntry = { i: number; san: string; cls?: string };
  type Row = { n: number; w?: MoveEntry; b?: MoveEntry };

  const rows = (moves as any[]).reduce<Row[]>((acc, move: any, i: number) => {
    const cls: string | undefined = analysis?.moveAnalyses?.[i]?.classification;
    if (move.color === 'white') {
      acc.push({ n: move.moveNumber as number, w: { i, san: move.san, cls } });
    } else if (acc.length > 0) {
      acc[acc.length - 1].b = { i, san: move.san, cls };
    } else {
      // black moves first (unusual but handle it)
      acc.push({ n: move.moveNumber as number, b: { i, san: move.san, cls } });
    }
    return acc;
  }, []);

  const classMeta = classification ? CLS[classification] : null;

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
            CSS Grid: [10px eval bar] [board 1fr]
            Same grid row → eval bar automatically = board height.
          */}
          <div style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: '8px', alignItems: 'stretch' }}>
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

          {/* Navigation controls */}
          <div className="flex items-center justify-center gap-1.5">
            <NavBtn onClick={goFirst} title="First (Home)"><ChevronsLeft size={15} /></NavBtn>
            <NavBtn onClick={() => go(-1)} title="Previous (←)"><ChevronLeft size={15} /></NavBtn>

            <div
              className="flex items-center gap-2 h-9 px-4 rounded-md border border-border bg-card min-w-[9rem] justify-center"
            >
              {idx >= 0 ? (
                <>
                  <span className="text-sm font-mono font-semibold">{moves[idx]?.san}</span>
                  {classification && classMeta && (
                    <span
                      className="inline-flex items-center justify-center rounded-full text-[7px] font-black"
                      style={{ width: 16, height: 16, backgroundColor: classMeta.bg, color: classMeta.text }}
                    >
                      {classMeta.badge}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{t('analysis.start')}</span>
              )}
            </div>

            <NavBtn onClick={() => go(1)} title="Next (→)"><ChevronRight size={15} /></NavBtn>
            <NavBtn onClick={goLast} title="Last (End)"><ChevronsRight size={15} /></NavBtn>
          </div>
          <p className="text-center text-[10px] text-muted-foreground select-none">{t('analysis.arrowKeys')}</p>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          {/* Analysis info */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
              <BarChart2 size={14} className="text-primary shrink-0" />
              <span className="font-semibold text-sm">{t('analysis.title')}</span>
              {analysis?.status === 'completed' && (
                <span className="ml-auto text-xs font-medium" style={{ color: '#96bc4b' }}>{t('analysis.complete')}</span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {!analysis && !requestMutation.isPending && !requestMutation.isSuccess && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Stockfish move-by-move evaluation.</p>
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
                      <span className="text-base leading-none">{classMeta.icon}</span>
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
                    <p className="text-xs text-muted-foreground">{idx < 0 ? t('analysis.selectMove') : t('analysis.noMoves')}</p>
                  )}

                  {evalDisplay && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('analysis.evaluation')}</span>
                      <span className={cn('font-bold tabular-nums font-mono text-sm', (evalCp ?? 0) > 50 ? 'text-green-500' : (evalCp ?? 0) < -50 ? 'text-red-400' : 'text-foreground')}>
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

          {/* Move list — chess.com style */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <span className="font-semibold text-sm">{t('analysis.moves')}</span>
              <span className="text-xs text-muted-foreground">({totalMoves})</span>
            </div>

            <div ref={moveListRef} className="max-h-80 overflow-y-auto overscroll-contain py-1">
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">{t('analysis.noMoves')}</p>
              ) : (
                rows.map(({ n, w, b }: Row) => (
                  <div key={n} className="flex items-center">
                    {/* Move number */}
                    <span className="text-muted-foreground text-xs font-mono w-9 text-right pr-1.5 shrink-0 select-none">
                      {n}.
                    </span>

                    {/* White move */}
                    {w ? (
                      <MoveBtn
                        san={w.san}
                        cls={w.cls}
                        active={idx === w.i}
                        onClick={() => setIdx(w.i)}
                        refEl={idx === w.i ? (el) => { activeBtnRef.current = el; } : undefined}
                      />
                    ) : (
                      <span className="w-[5.5rem] h-8" />
                    )}

                    {/* Black move */}
                    {b ? (
                      <MoveBtn
                        san={b.san}
                        cls={b.cls}
                        active={idx === b.i}
                        onClick={() => setIdx(b.i)}
                        refEl={idx === b.i ? (el) => { activeBtnRef.current = el; } : undefined}
                      />
                    ) : (
                      <span className="w-[5.5rem] h-8" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
