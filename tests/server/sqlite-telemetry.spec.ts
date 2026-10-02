import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createServerUser,
  authenticateUser,
  findUserByEmail,
  getAllUsers,
  getUserLoginHistory,
  getRecentLoginHistory,
  closeDatabase,
} from '../../src/lib/server/db';
import type { ClientInfo } from '../../src/lib/server/client-info';

describe('SQLite User Telemetry & Login History Analytics', () => {
  const testDbDir = path.resolve(process.cwd(), 'data', 'test-data');
  const testDbPath = path.join(testDbDir, 'test-telemetry.json');
  const testSqlitePath = path.join(testDbDir, 'test-telemetry.db');
  const originalEnv = process.env.HAVEN_SERVER_DB_PATH;

  function cleanupFiles() {
    closeDatabase();
    for (const f of [
      testDbPath,
      testSqlitePath,
      `${testSqlitePath}-wal`,
      `${testSqlitePath}-shm`,
    ]) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }
  }

  beforeEach(() => {
    process.env.HAVEN_SERVER_DB_PATH = testDbPath;
    cleanupFiles();
  });

  afterEach(() => {
    cleanupFiles();
    if (fs.existsSync(testDbDir)) {
      try {
        fs.rmdirSync(testDbDir);
      } catch {}
    }
    process.env.HAVEN_SERVER_DB_PATH = originalEnv;
  });

  const mockClientInfo: ClientInfo = {
    ip: '118.69.182.20',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
    browser: 'Google Chrome',
    browserVersion: '124',
    os: 'Windows 10/11',
    device: 'desktop',
    language: 'vi-VN',
  };

  it('records client telemetry on user registration', () => {
    const { user } = createServerUser({
      email: 'telemetry_user@havenart.space',
      name: 'Telemetry User',
      password: 'password123',
      clientInfo: mockClientInfo,
    });

    expect(user.createdIp).toBe('118.69.182.20');
    expect(user.lastIp).toBe('118.69.182.20');
    expect(user.lastBrowser).toBe('Google Chrome');
    expect(user.lastBrowserVersion).toBe('124');
    expect(user.lastOs).toBe('Windows 10/11');
    expect(user.lastDevice).toBe('desktop');
    expect(user.lastLanguage).toBe('vi-VN');
    expect(user.loginCount).toBe(1);

    // Verify written to database
    const found = findUserByEmail('telemetry_user@havenart.space');
    expect(found?.createdIp).toBe('118.69.182.20');
    expect(found?.lastBrowser).toBe('Google Chrome');
  });

  it('updates telemetry and tracks audit log in login_history on successive logins', () => {
    const { user } = createServerUser({
      email: 'history_user@havenart.space',
      name: 'History User',
      password: 'mypassword',
      clientInfo: mockClientInfo,
    });

    // 2nd Login from Mobile Safari
    const mobileClient: ClientInfo = {
      ip: '14.241.12.88',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) Safari/604.1',
      browser: 'Apple Safari',
      browserVersion: '17',
      os: 'iOS',
      device: 'mobile',
      language: 'en-US',
    };

    const authResult = authenticateUser('history_user@havenart.space', 'mypassword', mobileClient);
    expect(authResult).not.toBeNull();
    expect(authResult?.user.lastIp).toBe('14.241.12.88');
    expect(authResult?.user.lastBrowser).toBe('Apple Safari');
    expect(authResult?.user.lastOs).toBe('iOS');
    expect(authResult?.user.lastDevice).toBe('mobile');
    expect(authResult?.user.loginCount).toBe(2);

    // Check login history
    const history = getUserLoginHistory(user.id);
    expect(history.length).toBe(2);
    expect(history[0].browser).toBe('Apple Safari');
    expect(history[0].device).toBe('mobile');
    expect(history[0].status).toBe('success');
    expect(history[1].browser).toBe('Google Chrome');
  });

  it('records failed login attempts in login history for security audit', () => {
    createServerUser({
      email: 'victim@havenart.space',
      name: 'Victim',
      password: 'real_password',
      clientInfo: mockClientInfo,
    });

    const hackerClient: ClientInfo = {
      ip: '203.0.113.195',
      userAgent: 'Unknown Hacker Bot/1.0',
      browser: 'Unknown Browser',
      browserVersion: '',
      os: 'Linux',
      device: 'desktop',
      language: 'ru-RU',
    };

    const failed = authenticateUser('victim@havenart.space', 'wrong_pass', hackerClient);
    expect(failed).toBeNull();

    const recentLogs = getRecentLoginHistory();
    const failedLog = recentLogs.find((l) => l.email === 'victim@havenart.space' && l.status === 'failed');
    expect(failedLog).toBeDefined();
    expect(failedLog?.ip).toBe('203.0.113.195');
    expect(failedLog?.status).toBe('failed');
  });

  it('provides rich user telemetry in getAllUsers() for admin dashboard', () => {
    createServerUser({
      email: 'admin_view_user@havenart.space',
      name: 'Admin View User',
      password: 'password123',
      clientInfo: mockClientInfo,
    });

    const allUsers = getAllUsers();
    const target = allUsers.find((u) => u.email === 'admin_view_user@havenart.space');
    expect(target).toBeDefined();
    expect(target?.lastBrowser).toBe('Google Chrome');
    expect(target?.lastOs).toBe('Windows 10/11');
    expect(target?.lastDevice).toBe('desktop');
    expect(target?.lastIp).toBe('118.69.182.20');
  });
});
