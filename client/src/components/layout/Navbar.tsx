import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Globe } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { api } from '@/services/api';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'es', label: 'ES' },
];

export function Navbar() {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const { t, i18n: i18nInstance } = useTranslation();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } finally { clearAuth(); navigate('/'); }
  };

  const switchLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('chesskernel-lang', code);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg text-primary tracking-tight">
          ♔ ChessKernel
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <Link to="/play" className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors font-semibold text-foreground">
            {t('nav.play')}
          </Link>
          <Link to="/leaderboard" className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            {t('nav.leaderboard')}
          </Link>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Language picker */}
          <div className="flex items-center gap-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLang(l.code)}
                className={cn(
                  'w-8 h-7 text-xs font-bold rounded transition-colors',
                  i18nInstance.language === l.code
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <Link
                to={`/user/${user?.username}`}
                className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-medium"
              >
                {user?.username}
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link to="/login" className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {t('nav.signUp')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
