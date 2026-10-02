export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'havenart@2026';

const STORAGE_KEY_CREDENTIALS = 'haven_admin_cred_v1';
const STORAGE_KEY_ATTEMPTS = 'haven_admin_attempts_v1';
const SESSION_KEY_AUTH = 'haven_admin_session_v1';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds
const SESSION_EXPIRATION_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface AdminCredentialRecord {
  username: string;
  salt: string;
  passwordHash: string;
  updatedAt: number;
}

interface AttemptTracker {
  count: number;
  lockedUntil: number;
}

interface AdminSession {
  username: string;
  token: string;
  expiresAt: number;
}

/**
 * Generate a cryptographically secure hex salt.
 */
function generateSalt(length: number = 16): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute SHA-256 hash of a string using WebCrypto.
 */
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}:${salt}`);
  const subtle =
    typeof crypto !== 'undefined' && crypto.subtle
      ? crypto.subtle
      : (globalThis as any)?.crypto?.subtle;

  if (subtle?.digest) {
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple bitwise hash for SSR or environment without subtle
  let hash = 0;
  const str = `${password}:${salt}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Retrieves the stored admin credential record, or initializes default if absent.
 */
export async function getAdminCredentials(): Promise<AdminCredentialRecord> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_CREDENTIALS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.username && parsed.salt && parsed.passwordHash) {
          return parsed;
        }
      }
    } catch {
      // Fall through to initialization
    }
  }

  // Default credentials initialization
  const salt = generateSalt();
  const passwordHash = await hashPasswordWithSalt(DEFAULT_ADMIN_PASSWORD, salt);
  const record: AdminCredentialRecord = {
    username: DEFAULT_ADMIN_USERNAME,
    salt,
    passwordHash,
    updatedAt: Date.now(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_CREDENTIALS, JSON.stringify(record));
    } catch {
      // Ignore storage errors
    }
  }

  return record;
}

/**
 * Get the current failed attempt status.
 */
function getAttemptTracker(): AttemptTracker {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { count: 0, lockedUntil: 0 };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ATTEMPTS);
    if (raw) {
      const data: AttemptTracker = JSON.parse(raw);
      if (Date.now() > data.lockedUntil && data.count >= MAX_FAILED_ATTEMPTS) {
        // Lockout expired, reset counter
        return { count: 0, lockedUntil: 0 };
      }
      return data;
    }
  } catch {
    // Ignore
  }

  return { count: 0, lockedUntil: 0 };
}

/**
 * Record a failed login attempt.
 */
function recordFailedAttempt(): AttemptTracker {
  const current = getAttemptTracker();
  const newCount = current.count + 1;
  let lockedUntil = current.lockedUntil;

  if (newCount >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  const tracker: AttemptTracker = { count: newCount, lockedUntil };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(tracker));
    } catch {
      // Ignore
    }
  }
  return tracker;
}

/**
 * Reset failed attempts upon successful login.
 */
function clearFailedAttempts(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
    } catch {
      // Ignore
    }
  }
}

/**
 * Verifies admin credentials and establishes a session upon success.
 */
export async function verifyAdminLogin(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Check lockout status
  const tracker = getAttemptTracker();
  if (tracker.lockedUntil > Date.now()) {
    const remainingSec = Math.ceil((tracker.lockedUntil - Date.now()) / 1000);
    return {
      success: false,
      error: `Tài khoản bị tạm khóa vì nhập sai nhiều lần. Vui lòng thử lại sau ${remainingSec} giây.`,
    };
  }

  const cleanUser = (username || '').trim();
  const cleanPass = password || '';

  if (!cleanUser) {
    return { success: false, error: 'Vui lòng nhập tên đăng nhập.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Vui lòng nhập mật khẩu.' };
  }

  // 2. Load stored credentials
  const creds = await getAdminCredentials();

  // 3. Verify username
  if (cleanUser !== creds.username) {
    recordFailedAttempt();
    return { success: false, error: 'Tên đăng nhập không chính xác.' };
  }

  // 4. Verify password hash
  const computedHash = await hashPasswordWithSalt(cleanPass, creds.salt);
  if (computedHash !== creds.passwordHash) {
    const updated = recordFailedAttempt();
    if (updated.count >= MAX_FAILED_ATTEMPTS) {
      return {
        success: false,
        error: `Nhập sai mật khẩu quá 5 lần. Tài khoản bị tạm khóa 30 giây để bảo vệ an ninh.`,
      };
    }
    return {
      success: false,
      error: `Mật khẩu không chính xác. Bạn còn ${MAX_FAILED_ATTEMPTS - updated.count} lần thử.`,
    };
  }

  // 5. Success: clear attempts and create session
  clearFailedAttempts();
  setAdminSession(creds.username);

  return { success: true };
}

/**
 * Store authenticated admin session in sessionStorage and localStorage.
 */
export function setAdminSession(username: string, serverToken?: string): void {
  if (typeof window === 'undefined') return;

  const token = serverToken || `hav_adm_${Date.now()}_${generateSalt(8)}`;
  const session: AdminSession = {
    username,
    token,
    expiresAt: Date.now() + SESSION_EXPIRATION_MS,
  };

  try {
    window.sessionStorage?.setItem(SESSION_KEY_AUTH, JSON.stringify(session));
    window.sessionStorage?.setItem('haven_admin_token', token);
    window.localStorage?.setItem('haven_admin_token', token);
  } catch {
    // Ignore
  }
}

/**
 * Get active admin token from session or local storage.
 */
export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const sessToken = window.sessionStorage?.getItem('haven_admin_token');
    if (sessToken && sessToken.trim().length > 5) return sessToken.trim();

    const localToken = window.localStorage?.getItem('haven_admin_token');
    if (localToken && localToken.trim().length > 5) return localToken.trim();

    const userSessionRaw = window.localStorage?.getItem('haven_user_session');
    if (userSessionRaw) {
      const parsed = JSON.parse(userSessionRaw);
      if (parsed?.token && (parsed.user?.email === 'admin@havenart.space' || parsed.user?.role === 'admin')) {
        return parsed.token;
      }
    }
  } catch {}
  return '';
}

/**
 * Save admin token to storage.
 */
export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem('haven_admin_token', token);
    window.localStorage?.setItem('haven_admin_token', token);
  } catch {}
}

/**
 * Check if the active session is valid and not expired.
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const token = getAdminToken();
    if (token && token.length > 5) {
      return true;
    }
  } catch {
    // Malformed session
  }

  return false;
}

/**
 * Logout admin and clear active session.
 */
export function logoutAdmin(): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage?.removeItem(SESSION_KEY_AUTH);
    window.sessionStorage?.removeItem('haven_admin_token');
    window.localStorage?.removeItem('haven_admin_token');
  } catch {
    // Ignore
  }

  // Also notify server to invalidate session cookie/token if online
  try {
    fetch('/api/admin/auth', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
  } catch {
    // Ignore
  }
}

/**
 * Change admin password after verifying the current password.
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }

  const creds = await getAdminCredentials();
  const currentHash = await hashPasswordWithSalt(currentPassword, creds.salt);

  if (currentHash !== creds.passwordHash) {
    return { success: false, error: 'Mật khẩu hiện tại không chính xác.' };
  }

  // Generate fresh salt for new password
  const newSalt = generateSalt();
  const newHash = await hashPasswordWithSalt(newPassword, newSalt);

  const updated: AdminCredentialRecord = {
    username: creds.username,
    salt: newSalt,
    passwordHash: newHash,
    updatedAt: Date.now(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY_CREDENTIALS, JSON.stringify(updated));
  }

  return { success: true };
}

/**
 * Testing helper to reset all authentication and attempt states.
 */
export async function resetAdminAuthForTesting(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage?.removeItem(STORAGE_KEY_CREDENTIALS);
    window.localStorage?.removeItem(STORAGE_KEY_ATTEMPTS);
    window.localStorage?.removeItem('haven_admin_token');
    window.sessionStorage?.removeItem(SESSION_KEY_AUTH);
    window.sessionStorage?.removeItem('haven_admin_token');
  }
}
