/**
 * Client-Side Authentication Service for Haven Art
 * Connects to /api/auth endpoints and manages local user state.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export interface UserSession {
  user: AuthUser;
  token: string;
}

const STORAGE_KEY = 'haven_user_session';

/**
 * Get stored session if available.
 */
export function getStoredUserSession(): UserSession | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.token && parsed.user) {
      return parsed as UserSession;
    }
  } catch (e) {
    console.warn('Lỗi đọc session người dùng:', e);
  }
  return null;
}

/**
 * Save user session to localStorage and broadcast event.
 */
export function setStoredUserSession(session: UserSession | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('haven:user-auth-changed', {
          detail: { session },
        })
      );
    }
  } catch (e) {
    console.warn('Lỗi lưu session người dùng:', e);
  }
}

/**
 * Check if a user is currently logged in.
 */
export function isUserLoggedIn(): boolean {
  const session = getStoredUserSession();
  return !!(session && session.token);
}

/**
 * Get current user profile or null.
 */
export function getCurrentUser(): AuthUser | null {
  return getStoredUserSession()?.user || null;
}

/**
 * Get current auth token.
 */
export function getAuthToken(): string | null {
  return getStoredUserSession()?.token || null;
}

/**
 * Log out user.
 */
export function logoutUser(): void {
  const token = getAuthToken();
  setStoredUserSession(null);
  if (token) void fetch('/api/auth/logout', {method:'POST',headers:{Authorization:`Bearer ${token}`}}).catch(() => {});
}

export function isCloudEnabled(userId = getCurrentUser()?.id): boolean {
  try { return !!userId && localStorage.getItem(`haven_cloud_enabled:${userId}`) === 'true'; } catch { return false; }
}
export function disableCloudSync(): void {
  const userId = getCurrentUser()?.id;
  if (userId) localStorage.removeItem(`haven_cloud_enabled:${userId}`);
}
export function enableCloudSync(): void {
  const userId = getCurrentUser()?.id;
  if (userId) localStorage.setItem(`haven_cloud_enabled:${userId}`, 'true');
}

/**
 * Register a new user on the server.
 */
export async function registerUser(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Đăng ký không thành công.' };
    }

    const session: UserSession = {
      user: data.user,
      token: data.token,
    };
    setStoredUserSession(session);
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi mạng khi đăng ký.' };
  }
}

/**
 * Login user on the server.
 */
export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Đăng nhập không thành công.' };
    }

    const session: UserSession = {
      user: data.user,
      token: data.token,
    };
    setStoredUserSession(session);
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi mạng khi đăng nhập.' };
  }
}

/**
 * Verify current session with server.
 */
export async function checkSessionWithServer(): Promise<{
  valid: boolean;
  user?: AuthUser;
  serverEntryCount?: number;
}> {
  const token = getAuthToken();
  if (!token) return { valid: false };

  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      // Session expired
      logoutUser();
      return { valid: false };
    }

    if (!res.ok) return {valid:true,user:getCurrentUser() || undefined};
    const data = await res.json();
    return {
      valid: true,
      user: data.user,
      serverEntryCount: data.serverEntryCount,
    };
  } catch {
    // Network offline, keep cached session
    return { valid: true, user: getCurrentUser() || undefined };
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) window.dispatchEvent(new CustomEvent('haven:user-auth-changed',{detail:{session:getStoredUserSession()}}));
  });
}
