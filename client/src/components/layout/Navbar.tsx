import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, LogOut } from 'lucide-react';
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
        3-column CSS grid with FIXED right column width (260px).
        Nav text can change length freely without ever shifting the right section.
      */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 h-14"
        style={{ display: 'grid', gridTemplateColumns: '1fr auto 260px', alignItems: 'center', gap: '0' }}
      >
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-0.5">
          <Link
            to="/"
            className="flex items-center gap-1 font-black text-sm text-primary tracking-tight mr-4 shrink-0"
          >
            ♔ <span className="hidden sm:inline">ChessKernel</span>
          </Link>

          <Link
            to="/play"
            className={cn(
              'relative h-8 px-3 flex items-center text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              isActive('/play')
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {t('nav.play')}
            {isActive('/play') && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </Link>

          <Link
            to="/leaderboard"
            className={cn(
              'relative h-8 px-3 flex items-center text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              isActive('/leaderboard')
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {t('nav.leaderboard')}
            {isActive('/leaderboard') && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        </div>

        {/* Center: spacer (flex-1 equivalent in grid) */}
        <div />

        {/* Right: fixed 260px — controls never shift */}
        <div className="flex items-center justify-end gap-1.5">
          {/* Language switcher — always 88px */}
          <div className="flex items-center bg-muted rounded-lg p-0.5" style={{ width: 88 }}>
            {LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => switchLang(lang)}
                className={cn(
                  'flex-1 h-[26px] text-[11px] font-bold rounded-md transition-colors',
                  activeLang === lang
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Theme toggle — always 32px */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

          {/* Auth — always right-aligned inside fixed 260px column */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <Link
                to={`/user/${user?.username}`}
                className="flex items-center gap-1.5 h-8 px-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors max-w-[100px]"
              >
                <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="truncate hidden sm:inline">{user?.username}</span>
              </Link>
              {/* Icon-only logout — zero width change across languages */}
              <button
                onClick={handleLogout}
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <LogOut size={15} />
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
