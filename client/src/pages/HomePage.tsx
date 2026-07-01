import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';

export function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useTranslation();

  const features = [
    { icon: '⚡', key: 'realtime' },
    { icon: '🤖', key: 'bots' },
    { icon: '📊', key: 'analysis' },
  ] as const;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] gap-12 text-center px-4">
      <div className="space-y-5 max-w-2xl">
        <div className="text-7xl font-black tracking-tighter text-primary drop-shadow-sm">
          ♔ {t('home.title')}
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
          {t('home.subtitle')}
        </p>
      </div>

      <div className="flex gap-3">
        {isAuthenticated ? (
          <Link
            to="/play"
            className="bg-primary text-primary-foreground px-10 py-3.5 rounded-xl text-base font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50"
          >
            {t('home.playNow')}
          </Link>
        ) : (
          <>
            <Link
              to="/register"
              className="bg-primary text-primary-foreground px-10 py-3.5 rounded-xl text-base font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50"
            >
              {t('home.getStarted')}
            </Link>
            <Link
              to="/login"
              className="border-2 border-border px-10 py-3.5 rounded-xl text-base font-bold hover:bg-muted transition-all"
            >
              {t('nav.login')}
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {features.map(({ icon, key }) => (
          <div key={key} className="bg-card border rounded-2xl p-5 space-y-2 hover:border-primary/40 transition-colors text-left">
            <div className="text-4xl">{icon}</div>
            <h3 className="font-bold text-sm">{t(`home.features.${key}.title`)}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{t(`home.features.${key}.desc`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
