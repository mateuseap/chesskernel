import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 text-center">
      <div className="space-y-4">
        <h1 className="text-6xl font-bold text-primary">♔ ChessKernel</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Free, open-source chess platform. Play online, challenge bots, and analyze your games.
        </p>
      </div>

      <div className="flex gap-4">
        {isAuthenticated ? (
          <Link
            to="/play"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Play Now
          </Link>
        ) : (
          <>
            <Link
              to="/register"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="border border-border px-8 py-3 rounded-lg text-lg font-semibold hover:bg-muted transition-colors"
            >
              Login
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8 max-w-2xl">
        {[
          { icon: '⚡', title: 'Real-time', desc: 'Play live games against opponents worldwide' },
          { icon: '🤖', title: 'Bot Games', desc: 'Challenge Stockfish at any difficulty level' },
          { icon: '📊', title: 'Analysis', desc: 'Free post-game analysis powered by Stockfish' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-card border rounded-lg p-4 space-y-2">
            <div className="text-3xl">{icon}</div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
