import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Navbar } from './Navbar';
import { useAuthStore } from '@/stores/auth.store';
import { connectSocket, disconnectSocket } from '@/services/socket';

export function RootLayout() {
  const { isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket(accessToken);
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, accessToken]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
