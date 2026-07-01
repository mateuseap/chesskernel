import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/services/api';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();

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
    return <div className="text-center text-muted-foreground mt-16">Loading profile…</div>;
  }

  if (!user) {
    return <div className="text-center text-muted-foreground mt-16">User not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-card border rounded-lg p-6 flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl">
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          {user.bio && <p className="text-muted-foreground mt-1">{user.bio}</p>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {user.ratings?.map((r: any) => (
          <div key={r.timeControl} className="bg-card border rounded-lg p-4 text-center">
            <div className="text-xs text-muted-foreground capitalize mb-1">{r.timeControl}</div>
            <div className="text-2xl font-bold font-mono">{r.rating}</div>
            <div className="text-xs text-muted-foreground">{r.gamesPlayed} games</div>
          </div>
        ))}
      </div>

      {history?.games && history.games.length > 0 && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Recent Games</div>
          {history.games.slice(0, 10).map((game: any) => {
            const isWhite = game.white?.id === user.id;
            const opponentSide = isWhite ? game.black : game.white;
            const won = game.result === (isWhite ? 'white' : 'black');
            const drew = game.result === 'draw';

            return (
              <Link
                key={game.id}
                to={`/analysis/${game.id}`}
                className="flex items-center px-4 py-3 border-t hover:bg-muted/30 transition-colors"
              >
                <span
                  className={`w-2 h-2 rounded-full mr-3 ${won ? 'bg-green-500' : drew ? 'bg-yellow-500' : 'bg-red-500'}`}
                />
                <span className="flex-1 text-sm">
                  vs {opponentSide?.username ?? 'Bot'}
                </span>
                <span className="text-xs text-muted-foreground capitalize">{game.timeControl}</span>
                <span className="text-xs text-muted-foreground ml-4">
                  {new Date(game.createdAt).toLocaleDateString()}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
