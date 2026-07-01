import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import type { TimeControl } from '@chesskernel/shared';

export function LeaderboardPage() {
  const [timeControl, setTimeControl] = useState<TimeControl>('blitz');
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', timeControl],
    queryFn: () => api.get<any>(`/leaderboards/${timeControl}`),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t('nav.leaderboard')}</h1>

      <div className="flex gap-2">
        {(['bullet', 'blitz', 'rapid', 'classical'] as TimeControl[]).map((tc) => (
          <button
            key={tc}
            onClick={() => setTimeControl(tc)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize border transition-colors ${
              timeControl === tc
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted border-border'
            }`}
          >
            {tc}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Player</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Rating</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Games</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : (
              data?.entries?.map((entry: any) => (
                <tr key={entry.user.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{entry.rank}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/user/${entry.user.username}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <span className="font-medium">{entry.user.username}</span>
                      {entry.user.country && (
                        <span className="text-xs text-muted-foreground">{entry.user.country}</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{entry.rating}</td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">{entry.gamesPlayed}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
