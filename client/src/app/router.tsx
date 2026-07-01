import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { GamePage } from '@/pages/GamePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { PlayPage } from '@/pages/PlayPage';
import { InvitePage } from '@/pages/InvitePage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'user/:username', element: <ProfilePage /> },
      { path: 'invite/:token', element: <InvitePage /> },
      {
        path: 'play',
        element: <ProtectedRoute><PlayPage /></ProtectedRoute>,
      },
      {
        path: 'game/:gameId',
        element: <ProtectedRoute><GamePage /></ProtectedRoute>,
      },
      {
        path: 'analysis/:gameId',
        element: <ProtectedRoute><AnalysisPage /></ProtectedRoute>,
      },
    ],
  },
]);
