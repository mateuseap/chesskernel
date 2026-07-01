import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/services/api';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', { username, email, password });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/play');
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16 space-y-6 px-4">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('auth.register')}</h1>
        <p className="text-muted-foreground text-sm">{t('auth.registerSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('auth.username')}</label>
          <input
            type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+"
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            placeholder="chessMaster99"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('auth.email')}</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('auth.password')}</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading ? t('auth.creating') : t('auth.register')}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">{t('auth.loginLink')}</Link>
      </p>
    </div>
  );
}
