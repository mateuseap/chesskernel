import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSocket } from '@/services/socket';
import { api } from '@/services/api';
import { TIME_CONTROLS } from '@chesskernel/shared';
import { cn } from '@/lib/utils';
import type { TimeControlConfig } from '@chesskernel/shared';

const TIME_CONTROL_GROUPS: Record<string, { icon: string; keys: string[] }> = {
  Bullet:    { icon: '⚡', keys: ['bullet_1_0', 'bullet_1_1', 'bullet_2_1'] },
  Blitz:     { icon: '🔥', keys: ['blitz_3_0', 'blitz_3_2', 'blitz_5_0', 'blitz_5_3'] },
  Rapid:     { icon: '⏱', keys: ['rapid_10_0', 'rapid_10_5', 'rapid_15_10'] },
  Classical: { icon: '🏛', keys: ['classical_30_0', 'classical_30_20'] },
};

const BOT_DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'expert', 'maximum'] as const;
type BotDifficulty = typeof BOT_DIFFICULTIES[number];

const DIFFICULTY_COLORS: Record<BotDifficulty, string> = {
  beginner: 'text-green-600 dark:text-green-400',
  easy:     'text-green-500 dark:text-green-400',
  medium:   'text-yellow-600 dark:text-yellow-400',
  hard:     'text-orange-600 dark:text-orange-400',
  expert:   'text-red-600 dark:text-red-400',
  maximum:  'text-purple-600 dark:text-purple-400',
};

type Mode = 'online' | 'bot';
type ColorPref = 'white' | 'black' | 'random';

export function PlayPage() {
  const [mode, setMode] = useState<Mode>('online');
  const [selectedTc, setSelectedTc] = useState('blitz_5_0');
  const [inQueue, setInQueue] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');
  const [botColor, setBotColor] = useState<ColorPref>('random');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleQueueJoin = () => {
    const socket = getSocket();
    socket.once('queue:matched', ({ gameId }) => { setInQueue(false); navigate(`/game/${gameId}`); });
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-2">
      <h1 className="text-3xl font-bold tracking-tight">{t('play.title')}</h1>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {(['online', 'bot'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'px-6 py-2 rounded-lg text-sm font-semibold transition-all',
              mode === m
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'online' ? `🌐 ${t('play.online')}` : `🤖 ${t('play.vsBot')}`}
          </button>
        ))}
      </div>

      {/* Time control */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('play.timeControl')}</h2>
        {Object.entries(TIME_CONTROL_GROUPS).map(([group, { icon, keys }]) => (
          <div key={group}>
            <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
              <span>{icon}</span>
              <span>{t(`play.${group.toLowerCase()}` as any)}</span>
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {keys.map((key) => {
                const ctrl = TIME_CONTROLS[key];
                const isSelected = selectedTc === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTc(key)}
                    className={cn(
                      'flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all text-sm font-bold',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-muted text-foreground',
                    )}
                  >
                    <span className="text-base">{ctrl.label}</span>
                    <span className="text-[10px] font-normal text-muted-foreground mt-0.5 capitalize">{ctrl.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bot-specific options */}
      {mode === 'bot' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('play.difficulty')}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BOT_DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setBotDifficulty(d)}
                  className={cn(
                    'py-3 px-2 rounded-xl border-2 transition-all text-sm font-semibold capitalize',
                    botDifficulty === d
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted',
                  )}
                >
                  <span className={botDifficulty === d ? 'text-primary' : DIFFICULTY_COLORS[d]}>
                    {t(`play.difficulties.${d}` as any)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('play.playAs')}</h2>
            <div className="flex gap-2">
              {(['white', 'black', 'random'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setBotColor(c)}
                  className={cn(
                    'flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all capitalize',
                    botColor === c
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted text-foreground',
                  )}
                >
                  {c === 'white' ? '♔ ' + t('play.white') : c === 'black' ? '♚ ' + t('play.black') : '🎲 ' + t('play.random')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="pt-2">
        {mode === 'online' ? (
          inQueue ? (
            <div className="flex items-center gap-4 bg-card border rounded-xl p-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium">{t('play.searching')} · {tc.label}</span>
              </div>
              <button onClick={handleQueueLeave} className="text-sm text-destructive hover:underline font-medium">
                {t('play.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleQueueJoin}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-base font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
            >
              {t('play.findGame')} · {tc.label}
            </button>
          )
        ) : (
          <button
            onClick={handleBotGame}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-base font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
          >
            {t('play.playVsBot')} · {tc.label}
          </button>
        )}
      </div>
    </div>
  );
}
