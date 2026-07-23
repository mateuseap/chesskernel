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

interface NavLinkProps {
  to: string;
  label: string;
  active: boolean;
}

function NavLink({ to, label, active }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'relative h-8 px-2 sm:px-3 flex items-center text-sm font-medium rounded-md transition-colors whitespace-nowrap',
        active
          ? 'text-foreground bg-muted'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
      )}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
      )}
    </Link>
  );
}

export function Navbar() {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n: inst } = useTranslation();

  const activeLang = inst.language.toUpperCase().slice(0, 2) as Lang;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      navigate('/');
    }
  };

  const switchLang = (lang: Lang) => {
    i18n.changeLanguage(lang.toLowerCase());
    localStorage.setItem('chesskernel-lang', lang.toLowerCase());
  };

  const cycleLang = () => {
    const next = LANGS[(LANGS.indexOf(activeLang) + 1) % LANGS.length];
    switchLang(next);
  };

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card">
      {/*
        Layout rules that keep the bar stable across languages:
        - left and right blocks are pinned by justify-between, so link text
          growing never pushes the controls around
        - auth buttons reserve the width of their longest translation via
          ch-based minimums, so switching language never resizes them
        - every control has a fixed height and shrink-0
      */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Left: logo + primary nav */}
        <div className="flex items-center gap-0.5 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-1 font-black text-sm text-primary tracking-tight mr-2 sm:mr-4 shrink-0"
          >
            ♔ <span className="hidden md:inline">ChessKernel</span>
          </Link>
          <NavLink to="/play" label={t('nav.play')} active={isActive('/play')} />
          <NavLink
            to="/leaderboard"
            label={t('nav.leaderboard')}
            active={isActive('/leaderboard')}
          />
        </div>

        {/* Right: controls, all fixed-size */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Language: segmented control on sm+, single cycle button on mobile */}
          <div className="hidden sm:flex items-center bg-muted rounded-lg p-0.5 w-[88px] shrink-0">
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
          <button
            onClick={cycleLang}
            aria-label={t('nav.language')}
            title={t('nav.language')}
            className="sm:hidden w-9 h-8 flex items-center justify-center rounded-md bg-muted text-[11px] font-bold text-foreground shrink-0"
          >
            {activeLang}
          </button>

          <button
            onClick={toggle}
            aria-label={t('nav.theme')}
            title={t('nav.theme')}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="hidden sm:block w-px h-4 bg-border mx-0.5 shrink-0" />

          {isAuthenticated ? (
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to={`/user/${user?.username}`}
                className="flex items-center gap-1.5 h-8 px-1.5 sm:px-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors max-w-[110px]"
              >
                <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="truncate hidden sm:inline">{user?.username}</span>
              </Link>
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
            <div className="flex items-center gap-1 shrink-0">
              {/* min-w reserves the longest translation ("Iniciar sesión" /
                  "Registrarse"), so language switches never resize these */}
              <Link
                to="/login"
                className="hidden sm:flex h-8 px-2 min-w-[13ch] items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors whitespace-nowrap"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="h-8 px-2.5 sm:px-3 sm:min-w-[11ch] flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
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
