import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { Zap, Bot, BarChart2, Trophy, Globe } from 'lucide-react';

// The hero board is decorative; lazy-load react-chessboard so the landing
// page does not ship the board library in its critical path.
const Chessboard = lazy(() =>
  import('react-chessboard').then((m) => ({ default: m.Chessboard })),
);

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FEATURES = [
  { Icon: Zap,       key: 'realtime'  },
  { Icon: Bot,       key: 'bots'      },
  { Icon: BarChart2, key: 'analysis'  },
  { Icon: Trophy,    key: 'ladder'    },
  { Icon: Globe,     key: 'multilang' },
];

// Duplicate for seamless infinite loop
const CAROUSEL = [...FEATURES, ...FEATURES];

export function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero */}
      <section className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-16">
        <div className="flex flex-col lg:flex-row items-center gap-16 max-w-5xl w-full">
          {/* Text side */}
          <div className="flex-1 text-left max-w-lg">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-5">
              {t('home.tagline')}
            </span>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.06] text-foreground mb-5">
              {t('home.title')}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {t('home.subtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <Link
                  to="/play"
                  className="inline-flex items-center bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  {t('home.playNow')}
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    {t('home.getStarted')}
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-6 py-3.5 rounded-xl text-base font-semibold border border-border hover:bg-muted transition-colors"
                  >
                    {t('nav.login')}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Chess board — real piece images via react-chessboard */}
          <div className="shrink-0 relative" style={{ pointerEvents: 'none', userSelect: 'none', width: 300 }}>
            <div
              className="absolute rounded-3xl opacity-20 blur-3xl"
              style={{ inset: -24, backgroundColor: 'hsl(var(--primary))' }}
            />
            <Suspense fallback={<div className="rounded-[10px] bg-muted/40" style={{ width: 300, height: 300 }} />}>
              <Chessboard
                position={STARTING_FEN}
                arePiecesDraggable={false}
                customDarkSquareStyle={{ backgroundColor: '#769656' }}
                customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
                customBoardStyle={{
                  borderRadius: '10px',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
                }}
                showBoardNotation={false}
                animationDuration={0}
              />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Features — infinite-scroll carousel, pauses on hover */}
      <section className="py-20 border-t border-border">
        <div className="px-4 max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-3">{t('home.featuresTitle')}</h2>
          <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">{t('home.featuresSubtitle')}</p>
        </div>

        <div className="carousel-wrapper overflow-hidden select-none">
          <div className="carousel-track flex gap-5 w-max px-5">
            {CAROUSEL.map(({ Icon, key }, i) => (
              <div
                key={i}
                className="flex-none w-[272px] bg-card border border-border rounded-2xl p-6 space-y-4 relative overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-300"
              >
                {/* Accent top line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1.5">{t(`home.features.${key}.title` as any)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`home.features.${key}.desc` as any)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
