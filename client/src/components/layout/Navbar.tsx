import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { api } from '@/services/api';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';

const LANGS = ['EN', 'PT', 'ES'] as const;
type Lang = (typeof LANGS)[number];

export function Navbar() {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n: inst } = useTranslation();

  const activeLang = inst.language.toUpperCase().slice(0, 2) as Lang;

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } finally { clearAuth(); navigate('/'); }
  };

  const switchLang = (lang: Lang) => {
    i18n.changeLanguage(lang.toLowerCase());
    localStorage.setItem('chesskernel-lang', lang.toLowerCase());
  };

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card">
      {/*
        3-column grid:
          Left  (logo + nav): fixed min-width, left-aligned
          Center: flex-1 — absorbs any whitespace
          Right (controls): fixed min-width, right-aligned
        This prevents the language change from causing any layout shift.
      */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 h-14"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,auto) 1fr minmax(auto,320px)', alignItems: 'center' }}
      >
        {/* Left: logo + nav */}
        <div className="flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-1.5 font-black text-sm text-primary tracking-tight mr-3 shrink-0"
          >
            ♔ <span>ChessKernel</span>
          </Link>

          {/* Nav links — min-w so they don't shrink when text changes */}
          <Link
            to="/play"
            className={cn(
              'relative px-3 h-8 flex items-center text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              isActive('/play')
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {t('nav.play')}
            {isActive('/play') && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
          </Link>
          <Link
            to="/leaderboard"
            className={cn(
              'relative px-3 h-8 flex items-center text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              isActive('/leaderboard')
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {t('nav.leaderboard')}
            {isActive('/leaderboard') && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
          </Link>
        </div>

        {/* Center: spacer */}
        <div />

        {/* Right: controls */}
        <div className="flex items-center justify-end gap-1.5">
          {/* Language switcher */}
          <div
            className="flex items-center bg-muted rounded-lg p-0.5"
            style={{ minWidth: '88px' }}
          >
            {LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => switchLang(lang)}
                className={cn(
                  'w-[28px] h-[26px] text-[11px] font-bold rounded-md transition-colors',
                  activeLang === lang
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Theme */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-0.5">
              <Link
                to={`/user/${user?.username}`}
                className="hidden sm:flex items-center gap-1.5 h-8 px-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="truncate max-w-[80px]">{user?.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="h-8 px-2 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors whitespace-nowrap"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                to="/login"
                className="h-8 px-3 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors whitespace-nowrap"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="h-8 px-3 flex items-center bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
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
