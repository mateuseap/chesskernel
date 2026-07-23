import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAuthStore } from '@/stores/auth.store';
import i18n from '@/i18n';
import en from '@/i18n/locales/en.json';
import pt from '@/i18n/locales/pt.json';
import es from '@/i18n/locales/es.json';

vi.mock('@/services/api', () => ({
  api: { post: vi.fn().mockResolvedValue(undefined) },
}));

const NAV_LOCALES = { en: en.nav, pt: pt.nav, es: es.nav } as const;

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  beforeEach(async () => {
    cleanup();
    localStorage.clear();
    useAuthStore.getState().clearAuth();
    await i18n.changeLanguage('en');
  });

  describe.each(['en', 'pt', 'es'] as const)('anonymous variant in %s', (lang) => {
    it('renders translated labels with ch-based width reservations', async () => {
      await i18n.changeLanguage(lang);
      const nav = NAV_LOCALES[lang];

      renderNavbar();

      expect(screen.getByText(nav.play)).toBeTruthy();
      expect(screen.getByText(nav.leaderboard)).toBeTruthy();

      // ch-based min-widths reserve space for the longest translation so a
      // language switch can never resize the auth buttons.
      const loginLink = screen.getByText(nav.login).closest('a');
      expect(loginLink?.getAttribute('href')).toBe('/login');
      expect(loginLink?.className).toContain('min-w-[13ch]');
      expect(loginLink?.className).toContain('whitespace-nowrap');

      const signUpLink = screen.getByText(nav.signUp).closest('a');
      expect(signUpLink?.getAttribute('href')).toBe('/register');
      expect(signUpLink?.className).toContain('min-w-[11ch]');
      expect(signUpLink?.className).toContain('whitespace-nowrap');

      expect(screen.queryByLabelText(nav.logout)).toBeNull();
    });
  });

  it('shows the segmented language control with all three languages', () => {
    renderNavbar();

    for (const lang of ['EN', 'PT', 'ES']) {
      expect(screen.getAllByText(lang, { selector: 'button' }).length).toBeGreaterThan(0);
    }
  });

  it('switching language calls i18n.changeLanguage and persists to localStorage', async () => {
    const changeLanguageSpy = vi.spyOn(i18n, 'changeLanguage');
    renderNavbar();

    fireEvent.click(screen.getByText('PT', { selector: 'button' }));

    expect(changeLanguageSpy).toHaveBeenCalledWith('pt');
    await waitFor(() => expect(i18n.language).toBe('pt'));
    expect(localStorage.getItem('chesskernel-lang')).toBe('pt');

    fireEvent.click(screen.getByText('ES', { selector: 'button' }));
    await waitFor(() => expect(i18n.language).toBe('es'));
    expect(localStorage.getItem('chesskernel-lang')).toBe('es');
  });

  it('re-renders nav labels after a language switch', async () => {
    renderNavbar();
    expect(screen.getByText('Play')).toBeTruthy();

    fireEvent.click(screen.getByText('ES', { selector: 'button' }));

    await waitFor(() => expect(screen.getByText('Jugar')).toBeTruthy());
    expect(screen.queryByText('Play')).toBeNull();
  });

  it('authenticated variant shows the username and logout instead of auth links', () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', username: 'magnus', email: 'm@example.com', avatarUrl: null, isAdmin: false },
      'access',
      'refresh',
    );

    renderNavbar();

    expect(screen.getByText('magnus')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
    expect(screen.getByLabelText(en.nav.logout)).toBeTruthy();
    expect(screen.queryByText(en.nav.login)).toBeNull();
    expect(screen.queryByText(en.nav.signUp)).toBeNull();
  });

  it('logout calls the api and clears the auth session', async () => {
    const { api } = await import('@/services/api');
    useAuthStore.getState().setAuth(
      { id: 'u1', username: 'magnus', email: 'm@example.com', avatarUrl: null, isAdmin: false },
      'access',
      'refresh',
    );

    renderNavbar();
    fireEvent.click(screen.getByLabelText(en.nav.logout));

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('shows the theme toggle with an accessible label', () => {
    renderNavbar();
    expect(screen.getByLabelText(en.nav.theme)).toBeTruthy();
  });
});
