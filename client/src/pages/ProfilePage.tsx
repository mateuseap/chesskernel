import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { t } = useTranslation();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: () => api.get<any>(`/users/${username}`),
  });

  const { data: history } = useQuery({
    queryKey: ['games', user?.id],
    queryFn: () => api.get<any>(`/games/user/${user?.id}`),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-muted-foreground">
        {t('profile.loading')}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-muted-foreground">
        {t('profile.notFound')}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{user.username}</h1>
          {user.bio && <p className="text-muted-foreground mt-1 text-sm">{user.bio}</p>}
        </div>
      </div>

      {/* Ratings grid */}
      {user.ratings?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t('profile.ratings')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {user.ratings.map((r: any) => (
              <div key={r.timeControl} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className="text-xs text-muted-foreground capitalize mb-1.5">{r.timeControl}</div>
                <div className="text-2xl font-bold font-mono tabular-nums">{r.rating}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.gamesPlayed} {t('profile.games')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent games */}
      {history?.games && history.games.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold text-sm">{t('profile.recentGames')}</div>
          <div className="divide-y divide-border">
            {history.games.slice(0, 10).map((game: any) => {
              const isWhite = game.white?.id === user.id;
              const opponentSide = isWhite ? game.black : game.white;
              const won = game.result === (isWhite ? 'white' : 'black');
              const drew = game.result === 'draw';

              return (
                <Link
                  key={game.id}
                  to={`/analysis/${game.id}`}
                  className="flex items-center px-4 py-3 hover:bg-muted/40 transition-colors gap-3"
                >
                  <div className={`w-1.5 h-8 rounded-full shrink-0 ${won ? 'bg-green-500' : drew ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t('profile.vs')} {opponentSide?.username ?? 'Bot'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{game.timeControl}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${won ? 'text-green-500' : drew ? 'text-yellow-500' : 'text-red-500'}`}>
                      {won ? '1-0' : drew ? '½-½' : '0-1'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
