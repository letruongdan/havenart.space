import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  verifyAdminLogin,
  isAdminAuthenticated,
  logoutAdmin,
  changeAdminPassword,
  resetAdminAuthForTesting,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
} from '../../src/lib/admin/auth';

describe('Admin Authentication System', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    await resetAdminAuthForTesting();
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated access by default', () => {
    expect(isAdminAuthenticated()).toBe(false);
  });

  it('authenticates successfully with default credentials', async () => {
    const result = await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(isAdminAuthenticated()).toBe(true);
  });

  it('rejects incorrect username', async () => {
    const result = await verifyAdminLogin('wrong_user', DEFAULT_ADMIN_PASSWORD);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tên đăng nhập');
    expect(isAdminAuthenticated()).toBe(false);
  });

  it('rejects incorrect password', async () => {
    const result = await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, 'wrong_pass');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/mật khẩu/i);
    expect(isAdminAuthenticated()).toBe(false);
  });

  it('locks out after 5 consecutive failed attempts', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, 'wrong');
      expect(res.success).toBe(false);
      expect(res.error).not.toContain('tạm khóa');
    }

    // 5th attempt
    const fifth = await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, 'wrong');
    expect(fifth.success).toBe(false);
    expect(fifth.error).toContain('tạm khóa');

    // 6th attempt is blocked immediately
    const blocked = await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);
    expect(blocked.success).toBe(false);
    expect(blocked.error).toContain('tạm khóa');
  });

  it('allows logging out and clears session', async () => {
    await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);
    expect(isAdminAuthenticated()).toBe(true);

    logoutAdmin();
    expect(isAdminAuthenticated()).toBe(false);
  });

  it('supports changing password and persists new hash', async () => {
    await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);

    const changeRes = await changeAdminPassword(DEFAULT_ADMIN_PASSWORD, 'newSecurePass123!');
    expect(changeRes.success).toBe(true);

    // Old password fails
    const oldLogin = await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);
    expect(oldLogin.success).toBe(false);

    // New password succeeds
    const newLogin = await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, 'newSecurePass123!');
    expect(newLogin.success).toBe(true);
  });

  it('rejects changing password with invalid current password', async () => {
    await verifyAdminLogin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);

    const changeRes = await changeAdminPassword('wrongCurrentPassword', 'newSecurePass123!');
    expect(changeRes.success).toBe(false);
    expect(changeRes.error).toContain('hiện tại');
  });
});
