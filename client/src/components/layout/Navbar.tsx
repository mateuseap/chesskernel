import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { api } from '@/services/api';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';

const LANGS = ['EN', 'PT', 'ES'] as const;
type Lang = typeof LANGS[number];

export function Navbar() {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const { t, i18n: inst } = useTranslation();

  const activeLang = inst.language.toUpperCase().slice(0, 2) as Lang;

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } finally { clearAuth(); navigate('/'); }
  };

  const switchLang = (lang: Lang) => {
    i18n.changeLanguage(lang.toLowerCase());
    localStorage.setItem('chesskernel-lang', lang.toLowerCase());
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-extrabold text-base text-primary tracking-tight shrink-0 hover:opacity-90 transition-opacity"
        >
          ♔ ChessKernel
        </Link>

        {/* Center nav */}
        <div className="hidden sm:flex items-center gap-1">
          <Link
            to="/play"
            className="px-3 py-1.5 rounded-md text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            {t('nav.play')}
          </Link>
          <Link
            to="/leaderboard"
            className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {t('nav.leaderboard')}
          </Link>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Language switcher — fixed-width buttons prevent layout shift */}
          <div className="flex items-center" role="group" aria-label="Language">
            {LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => switchLang(lang)}
                className={cn(
                  'w-9 h-8 text-xs font-bold rounded transition-colors',
                  activeLang === lang
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <Link
                to={`/user/${user?.username}`}
                className="hidden sm:block max-w-[100px] truncate px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {user?.username}
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
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
