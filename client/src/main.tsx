import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import './i18n';
import './app/globals.css';
import { useThemeStore } from './stores/theme.store';

// Apply persisted theme before first render to avoid flash
const savedTheme = (() => {
  try {
    const s = localStorage.getItem('chesskernel-theme');
    if (s) return JSON.parse(s)?.state?.theme ?? 'dark';
  } catch { /* */ }
  return 'dark';
})();
document.documentElement.classList.toggle('dark', savedTheme === 'dark');

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
