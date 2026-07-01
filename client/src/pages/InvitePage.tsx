import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api.get<any>(`/invitations/${token}`),
  });

  const handleAccept = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/invite/${token}` } } });
      return;
    }

    try {
      const result = await api.post<{ gameId: string }>(`/invitations/${token}/accept`);
      navigate(`/game/${result.gameId}`);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err.message);
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground mt-16">Loading invitation…</div>;
  }

  if (error || !invitation) {
    return <div className="text-center text-muted-foreground mt-16">Invitation not found or expired</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-16 space-y-6 text-center">
      <h1 className="text-2xl font-bold">Game Invitation</h1>
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <p className="text-lg">
          <span className="font-semibold">{invitation.sender.username}</span> challenges you to a game
        </p>
        <div className="text-muted-foreground">
          {invitation.timeControl} · {invitation.initialTimeMs / 60000}min
          {invitation.incrementMs > 0 && `+${invitation.incrementMs / 1000}s`}
        </div>
        <button
          onClick={handleAccept}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          {isAuthenticated ? 'Accept Challenge' : 'Login to Accept'}
        </button>
      </div>
    </div>
  );
}
