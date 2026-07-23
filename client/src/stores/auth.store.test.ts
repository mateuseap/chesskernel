import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';

const user = {
  id: 'u1',
  username: 'magnus',
  email: 'magnus@example.com',
  avatarUrl: null,
  isAdmin: false,
};

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
  });

  it('starts unauthenticated with no user or tokens', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('setAuth stores the user with both tokens and flips isAuthenticated', () => {
    useAuthStore.getState().setAuth(user, 'access-1', 'refresh-1');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
  });

  it('updateAccessToken replaces only the access token', () => {
    useAuthStore.getState().setAuth(user, 'access-1', 'refresh-1');
    useAuthStore.getState().updateAccessToken('access-2');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-2');
    expect(state.refreshToken).toBe('refresh-1');
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it('clearAuth wipes the entire session', () => {
    useAuthStore.getState().setAuth(user, 'access-1', 'refresh-1');
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('persists the session under the chesskernel-auth localStorage key', () => {
    useAuthStore.getState().setAuth(user, 'access-1', 'refresh-1');

    const raw = localStorage.getItem('chesskernel-auth');
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw as string);
    expect(persisted.state).toEqual({
      user,
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      isAuthenticated: true,
    });
  });
});
