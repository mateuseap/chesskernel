import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './theme.store';

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().setTheme('dark');
  });

  it('defaults to dark theme', () => {
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme applies the dark class on the document root', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    useThemeStore.getState().setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggle flips between dark and light', () => {
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe('light');

    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('persists the selection under the chesskernel-theme localStorage key', () => {
    useThemeStore.getState().setTheme('light');

    const raw = localStorage.getItem('chesskernel-theme');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).state.theme).toBe('light');
  });
});
