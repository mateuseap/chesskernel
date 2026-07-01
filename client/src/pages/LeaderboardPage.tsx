import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import type { TimeControl } from '@chesskernel/shared';

const TC_ICONS: Record<TimeControl, string> = {
  bullet: '⚡',
  blitz: '🔥',
  rapid: '⏱',
  classical: '🏛',
};

export function LeaderboardPage() {
  const [timeControl, setTimeControl] = useState<TimeControl>('blitz');
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', timeControl],
    queryFn: () => api.get<any>(`/leaderboards/${timeControl}`),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('leaderboard.title')}</h1>

      <div className="flex gap-1 border-b border-border">
        {(['bullet', 'blitz', 'rapid', 'classical'] as TimeControl[]).map((tc) => (
          <button
            key={tc}
            onClick={() => setTimeControl(tc)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px capitalize',
              timeControl === tc
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
            )}
          >
            <span>{TC_ICONS[tc]}</span>
            <span>{t(`play.${tc}` as any)}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">{t('leaderboard.rank')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('leaderboard.player')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('leaderboard.rating')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t('leaderboard.games')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {t('leaderboard.loading')}
                </td>
              </tr>
            ) : data?.entries?.length > 0 ? (
              data.entries.map((entry: any, i: number) => (
                <tr key={entry.user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground font-bold">
                    {i + 1 <= 3 ? ['🥇','🥈','🥉'][i] : `${i + 1}`}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/user/${entry.user.username}`}
                      className="flex items-center gap-2.5 hover:text-primary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {entry.user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-sm group-hover:text-primary">{entry.user.username}</span>
                        {entry.user.country && (
                          <span className="text-xs text-muted-foreground ml-1.5">{entry.user.country}</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-sm">{entry.rating}</td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">{entry.gamesPlayed}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No players yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
