import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Heavy routes are lazy-loaded so the landing/login path does not pay for
// chess.js, react-chessboard, or the analysis view up front.
const GamePage = lazy(() => import('@/pages/GamePage').then((m) => ({ default: m.GamePage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const PlayPage = lazy(() => import('@/pages/PlayPage').then((m) => ({ default: m.PlayPage })));
const InvitePage = lazy(() => import('@/pages/InvitePage').then((m) => ({ default: m.InvitePage })));
const AnalysisPage = lazy(() => import('@/pages/AnalysisPage').then((m) => ({ default: m.AnalysisPage })));

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'leaderboard', element: <Lazy><LeaderboardPage /></Lazy> },
      { path: 'user/:username', element: <Lazy><ProfilePage /></Lazy> },
      { path: 'invite/:token', element: <Lazy><InvitePage /></Lazy> },
      {
        path: 'play',
        element: <ProtectedRoute><Lazy><PlayPage /></Lazy></ProtectedRoute>,
      },
      {
        path: 'game/:gameId',
        element: <ProtectedRoute><Lazy><GamePage /></Lazy></ProtectedRoute>,
      },
      {
        path: 'analysis/:gameId',
        element: <ProtectedRoute><Lazy><AnalysisPage /></Lazy></ProtectedRoute>,
      },
    ],
  },
]);
