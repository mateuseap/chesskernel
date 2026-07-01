import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/services/api';

export function Navbar() {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      navigate('/');
    }
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          ♔ ChessKernel
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link to="/play" className="hover:text-primary transition-colors font-medium">
            Play
          </Link>
          <Link to="/leaderboard" className="hover:text-primary transition-colors">
            Leaderboard
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                to={`/user/${user?.username}`}
                className="hover:text-primary transition-colors"
              >
                {user?.username}
              </Link>
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
