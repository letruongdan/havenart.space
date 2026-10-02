import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStoredUserSession,
  setStoredUserSession,
  isUserLoggedIn,
  getCurrentUser,
  getAuthToken,
  logoutUser,
  registerUser,
  loginUser,
  type UserSession,
} from '../../src/lib/auth/user-client';

describe('Client-Side User Authentication Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initially has no logged in user', () => {
    expect(isUserLoggedIn()).toBe(false);
    expect(getCurrentUser()).toBeNull();
    expect(getAuthToken()).toBeNull();
    expect(getStoredUserSession()).toBeNull();
  });

  it('persists user session and emits custom event', () => {
    const mockSession: UserSession = {
      user: {
        id: 'usr_123',
        email: 'test@havenart.space',
        name: 'Thanh Tam',
        createdAt: Date.now(),
      },
      token: 'mock_token_abc',
    };

    let eventFired = false;
    window.addEventListener('haven:user-auth-changed', () => {
      eventFired = true;
    });

    setStoredUserSession(mockSession);

    expect(isUserLoggedIn()).toBe(true);
    expect(getCurrentUser()?.email).toBe('test@havenart.space');
    expect(getAuthToken()).toBe('mock_token_abc');
    expect(eventFired).toBe(true);

    // Logout
    logoutUser();
    expect(isUserLoggedIn()).toBe(false);
    expect(getCurrentUser()).toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  it('handles registerUser network call successfully', async () => {
    const mockUser = {
      id: 'usr_reg',
      email: 'reg@havenart.space',
      name: 'Nguyen Van A',
      createdAt: 1000,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        user: mockUser,
        token: 'token_reg',
      }),
    } as any);

    const res = await registerUser({
      email: 'reg@havenart.space',
      password: 'password123',
      name: 'Nguyen Van A',
    });

    expect(res.success).toBe(true);
    expect(res.user?.email).toBe('reg@havenart.space');
    expect(isUserLoggedIn()).toBe(true);
    expect(getAuthToken()).toBe('token_reg');
  });

  it('handles loginUser rejection gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Email hoặc mật khẩu không chính xác.',
      }),
    } as any);

    const res = await loginUser({
      email: 'wrong@havenart.space',
      password: 'badpassword',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('không chính xác');
    expect(isUserLoggedIn()).toBe(false);
  });
});
