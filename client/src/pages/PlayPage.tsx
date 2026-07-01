import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSocket } from '@/services/socket';
import { api } from '@/services/api';
import { TIME_CONTROLS } from '@chesskernel/shared';
import { cn } from '@/lib/utils';
import type { TimeControlConfig } from '@chesskernel/shared';

type BotDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' | 'maximum';
type ColorPref = 'white' | 'black' | 'random';
type Mode = 'online' | 'bot';
type Category = 'bullet' | 'blitz' | 'rapid' | 'classical';

interface CategoryConfig {
  key: Category;
  icon: string;
  label: string;
  timeControlKeys: string[];
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'bullet',    icon: '⚡', label: 'bullet',    timeControlKeys: ['bullet_1_0', 'bullet_1_1', 'bullet_2_1'] },
  { key: 'blitz',     icon: '🔥', label: 'blitz',     timeControlKeys: ['blitz_3_0', 'blitz_3_2', 'blitz_5_0', 'blitz_5_3'] },
  { key: 'rapid',     icon: '⏱', label: 'rapid',     timeControlKeys: ['rapid_10_0', 'rapid_10_5', 'rapid_15_10'] },
  { key: 'classical', icon: '🏛', label: 'classical', timeControlKeys: ['classical_30_0', 'classical_30_20'] },
];

const BOT_DIFFICULTIES: BotDifficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert', 'maximum'];

const DIFFICULTY_COLORS: Record<BotDifficulty, string> = {
  beginner: 'text-green-600 dark:text-green-400',
  easy:     'text-green-500 dark:text-green-400',
  medium:   'text-yellow-600 dark:text-yellow-400',
  hard:     'text-orange-500 dark:text-orange-400',
  expert:   'text-red-500 dark:text-red-400',
  maximum:  'text-purple-600 dark:text-purple-400',
};

function fmtMs(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return s === 0 ? `${m}:00` : `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayPage() {
  const [mode, setMode] = useState<Mode>('online');
  const [category, setCategory] = useState<Category>('blitz');
  const [selectedTc, setSelectedTc] = useState('blitz_5_0');
  const [inQueue, setInQueue] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');
  const [botColor, setBotColor] = useState<ColorPref>('random');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    const cats = CATEGORIES.find((c) => c.key === cat);
    if (cats?.timeControlKeys[0]) setSelectedTc(cats.timeControlKeys[0]);
  };

  const handleQueueJoin = () => {
    const socket = getSocket();
    socket.once('queue:matched', ({ gameId }: { gameId: string }) => {
      setInQueue(false);
      navigate(`/game/${gameId}`);
    });
    socket.emit('queue:join', { timeControlKey: selectedTc });
    setInQueue(true);
  };

  const handleQueueLeave = () => {
    getSocket().emit('queue:leave');
    setInQueue(false);
  };

  const handleBotGame = async () => {
    const game = await api.post<{ id: string }>('/matchmaking/bot', {
      timeControlKey: selectedTc,
      difficulty: botDifficulty,
      colorPreference: botColor,
    });
    navigate(`/game/${game.id}`);
  };

  const tc = TIME_CONTROLS[selectedTc] as TimeControlConfig;
  const activeCat = CATEGORIES.find((c) => c.key === category)!;

  return (
    <div className="max-w-xl mx-auto space-y-6 px-2">
      <h1 className="text-3xl font-bold tracking-tight">{t('play.title')}</h1>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {(['online', 'bot'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
              mode === m
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'online' ? `🌐 ${t('play.online')}` : `🤖 ${t('play.vsBot')}`}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3">
          {t('play.timeControl')}
        </p>
        <div className="flex gap-1 border-b border-border">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px',
                category === cat.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
              )}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              <span className="hidden sm:inline">{t(`play.${cat.label}` as any)}</span>
            </button>
          ))}
        </div>

        {/* Time control cards for selected category */}
        <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: `repeat(${Math.min(activeCat.timeControlKeys.length, 4)}, 1fr)` }}>
          {activeCat.timeControlKeys.map((key) => {
            const ctrl = TIME_CONTROLS[key] as TimeControlConfig;
            const isSelected = selectedTc === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedTc(key)}
                className={cn(
                  'group flex flex-col items-center justify-center py-5 px-3 rounded-2xl border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 dark:bg-primary/15 shadow-md shadow-primary/20'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted',
                )}
              >
                <span className={cn(
                  'text-2xl font-bold tabular-nums leading-none',
                  isSelected ? 'text-primary' : 'text-foreground',
                )}>
                  {fmtMs(ctrl.initialTimeMs)}
                </span>
                {ctrl.incrementMs > 0 && (
                  <span className={cn(
                    'text-xs font-medium mt-1',
                    isSelected ? 'text-primary/70' : 'text-muted-foreground',
                  )}>
                    +{ctrl.incrementMs / 1000}s
                  </span>
                )}
                <span className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider mt-2',
                  isSelected ? 'text-primary/60' : 'text-muted-foreground/60',
                )}>
                  {t(`play.${ctrl.type}` as any)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bot-specific options */}
      {mode === 'bot' && (
        <div className="space-y-5">
          {/* Difficulty */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">{t('play.difficulty')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BOT_DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setBotDifficulty(d)}
                  className={cn(
                    'py-2.5 px-1 rounded-xl border-2 transition-all text-xs font-semibold capitalize',
                    botDifficulty === d
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/15'
                      : 'border-border bg-card hover:border-primary/40',
                  )}
                >
                  <span className={botDifficulty === d ? 'text-primary' : DIFFICULTY_COLORS[d]}>
                    {t(`play.difficulties.${d}` as any)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">{t('play.playAs')}</p>
            <div className="grid grid-cols-3 gap-2">
              {(['white', 'black', 'random'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setBotColor(c)}
                  className={cn(
                    'py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                    botColor === c
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/15'
                      : 'border-border bg-card hover:border-primary/40 text-foreground',
                  )}
                >
                  {c === 'white' ? `♔ ${t('play.white')}` : c === 'black' ? `♚ ${t('play.black')}` : `🎲 ${t('play.random')}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="pb-4">
        {mode === 'online' ? (
          inQueue ? (
            <div className="flex items-center gap-4 bg-card border rounded-2xl p-4">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="flex-1 text-sm font-medium">
                {t('play.searching')} · {fmtMs(tc.initialTimeMs)}{tc.incrementMs > 0 ? ` +${tc.incrementMs / 1000}s` : ''}
              </span>
              <button onClick={handleQueueLeave} className="text-sm text-destructive hover:underline font-medium">
                {t('play.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleQueueJoin}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-base font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35"
            >
              {t('play.findGame')} · {fmtMs(tc.initialTimeMs)}{tc.incrementMs > 0 ? ` +${tc.incrementMs / 1000}s` : ''}
            </button>
          )
        ) : (
          <button
            onClick={handleBotGame}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-base font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35"
          >
            {t('play.playVsBot')} · {fmtMs(tc.initialTimeMs)}{tc.incrementMs > 0 ? ` +${tc.incrementMs / 1000}s` : ''}
          </button>
        )}
      </div>
    </div>
  );
}
