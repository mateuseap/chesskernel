import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const { t, i18n: inst } = useTranslation();

  const activeLang = (inst.language.toUpperCase().slice(0, 2)) as Lang;

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } finally { clearAuth(); navigate('/'); }
  };

  const switchLang = (lang: Lang) => {
    i18n.changeLanguage(lang.toLowerCase());
    localStorage.setItem('chesskernel-lang', lang.toLowerCase());
  };

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to || location.pathname.startsWith(to + '/');
    return (
      <Link
        to={to}
        className={cn(
          'relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          active
            ? 'text-foreground bg-muted'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        )}
      >
        {label}
        {active && (
          <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-2">

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 font-black text-base text-primary tracking-tight shrink-0 mr-2"
        >
          ♔ <span className="hidden sm:inline">ChessKernel</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {navLink('/play', t('nav.play'))}
          {navLink('/leaderboard', t('nav.leaderboard'))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Language switcher */}
        <div className="flex items-center rounded-lg bg-muted/60 p-0.5" role="group">
          {LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => switchLang(lang)}
              className={cn(
                'w-9 h-7 text-[11px] font-bold rounded-md transition-colors',
                activeLang === lang
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Auth */}
        {isAuthenticated ? (
          <div className="flex items-center gap-0.5">
            <Link
              to={`/user/${user?.username}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors max-w-[120px]"
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span className="truncate">{user?.username}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t('nav.login')}
            </Link>
            <Link
              to="/register"
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              {t('nav.signUp')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
