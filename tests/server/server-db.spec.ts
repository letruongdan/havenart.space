import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  readServerDatabase,
  writeServerDatabase,
  createServerUser,
  authenticateUser,
  findUserByEmail,
  findUserByToken,
  upsertServerEntries,
  getUserServerEntries,
  getServerDbPath,
  getAllUsers,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  addServerFeedback,
  getAllServerFeedbacks,
  deleteServerFeedback,
  getFeedbackStats,
  recordServerSession,
  getServerAnalyticsSummary,
  exportServerDatabase,
  importServerDatabase,
} from '../../src/lib/server/db';

describe('Server Database & User Sync Storage', () => {
  const testDbDir = path.resolve(process.cwd(), 'data', 'test-data');
  const testDbPath = path.join(testDbDir, 'test-server-db.json');
  const originalEnv = process.env.HAVEN_SERVER_DB_PATH;

  beforeEach(() => {
    process.env.HAVEN_SERVER_DB_PATH = testDbPath;
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbDir)) {
      try {
        fs.rmdirSync(testDbDir);
      } catch {}
    }
    process.env.HAVEN_SERVER_DB_PATH = originalEnv;
  });

  it('initializes a fresh database file with version 2', () => {
    const db = readServerDatabase();
    expect(db.version).toBe(2);
    expect(db.users.length).toBeGreaterThanOrEqual(1); // Auto-seeds root admin
    expect(db.users.some(u => u.role === 'admin')).toBe(true);
    expect(db.entries).toEqual([]);
    expect(fs.existsSync(testDbPath)).toBe(true);
  });

  it('registers a new user and hashes password securely', () => {
    const { user, token } = createServerUser({
      email: 'user@havenart.space',
      name: 'Nguyen An',
      password: 'password123',
    });

    expect(user.id).toMatch(/^usr_/);
    expect(user.email).toBe('user@havenart.space');
    expect(user.name).toBe('Nguyen An');
    expect(user.passwordHash).not.toBe('password123');
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(16);

    // Verify written to disk
    const found = findUserByEmail('user@havenart.space');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Nguyen An');
  });

  it('prevents registering duplicate emails', () => {
    createServerUser({
      email: 'duplicate@havenart.space',
      name: 'User 1',
      password: 'password123',
    });

    expect(() => {
      createServerUser({
        email: 'DUPLICATE@havenart.space',
        name: 'User 2',
        password: 'password456',
      });
    }).toThrow(/đã được đăng ký/);
  });

  it('authenticates valid credentials and rejects wrong passwords', () => {
    createServerUser({
      email: 'login@havenart.space',
      name: 'Login User',
      password: 'correct_password',
    });

    const validAuth = authenticateUser('login@havenart.space', 'correct_password');
    expect(validAuth).not.toBeNull();
    expect(validAuth?.user.email).toBe('login@havenart.space');
    expect(validAuth?.token).toBeDefined();

    const invalidAuth = authenticateUser('login@havenart.space', 'wrong_password');
    expect(invalidAuth).toBeNull();

    const nonExistent = authenticateUser('nonexistent@havenart.space', 'pass');
    expect(nonExistent).toBeNull();
  });

  it('retrieves user by session token', () => {
    const { token } = createServerUser({
      email: 'token@havenart.space',
      name: 'Token User',
      password: 'secret_token_pass',
    });

    const user = findUserByToken(token);
    expect(user).toBeDefined();
    expect(user?.email).toBe('token@havenart.space');

    expect(findUserByToken('invalid_token_xyz')).toBeUndefined();
  });

  it('upserts and retrieves user entries on server with timestamp protection', () => {
    const { user } = createServerUser({
      email: 'entries@havenart.space',
      name: 'Entries User',
      password: 'password123',
    });

    const entry1 = {
      id: 'entry-1',
      title: 'Khoảnh khắc an yên',
      body: 'Gió nhẹ bên hiên nhà.',
      mood: 'calm',
      createdAt: 1000,
      updatedAt: 1000,
      deletedAt: null,
    };

    const entry2 = {
      id: 'entry-2',
      title: 'Đêm trăng',
      body: 'Ánh trăng soi sáng trang sách.',
      mood: 'reflective',
      createdAt: 2000,
      updatedAt: 2000,
      deletedAt: null,
    };

    const res1 = upsertServerEntries(user.id, [entry1, entry2]);
    expect(res1.syncedCount).toBe(2);
    expect(res1.totalCount).toBe(2);

    const saved = getUserServerEntries(user.id);
    expect(saved.length).toBe(2);
    expect(saved[0].id).toBe('entry-2'); // Sorted descending by createdAt

    // Update entry1 with newer updatedAt
    const updatedEntry1 = {
      ...entry1,
      body: 'Gió nhẹ bên hiên nhà buổi sớm mai rực rỡ.',
      updatedAt: 3000,
    };

    const res2 = upsertServerEntries(user.id, [updatedEntry1]);
    expect(res2.syncedCount).toBe(1);

    const reloaded = getUserServerEntries(user.id);
    const target = reloaded.find((e) => e.id === 'entry-1');
    expect(target?.body).toContain('buổi sớm mai');
  });

  it('manages feedbacks with ratings, statistics, and deletion', () => {
    const fb1 = addServerFeedback({
      userName: 'Lan Huong',
      userEmail: 'huong@havenart.space',
      rating: 5,
      category: 'peace',
      comment: 'Không gian thật tĩnh lặng và an yên.',
      device: 'Desktop',
    });

    const fb2 = addServerFeedback({
      userName: 'Minh Tri',
      rating: 4,
      category: 'music',
      comment: 'Bản nhạc Clair de Lune rất tuyệt vời.',
      device: 'Mobile',
    });

    const all = getAllServerFeedbacks();
    expect(all.length).toBe(2);

    const stats = getFeedbackStats();
    expect(stats.totalCount).toBe(2);
    expect(stats.averageRating).toBe(4.5);
    expect(stats.distribution[5]).toBe(1);
    expect(stats.distribution[4]).toBe(1);

    const deleted = deleteServerFeedback(fb1.id);
    expect(deleted).toBe(true);
    expect(getAllServerFeedbacks().length).toBe(1);
  });

  it('records session heartbeats and calculates traffic analytics', () => {
    recordServerSession({
      sessionId: 'sess_1',
      durationSeconds: 120,
      pageViews: 3,
      device: 'desktop',
      browser: 'chrome',
      os: 'windows',
    });

    recordServerSession({
      sessionId: 'sess_2',
      durationSeconds: 300,
      pageViews: 5,
      device: 'mobile',
      browser: 'safari',
      os: 'ios',
    });

    const summary = getServerAnalyticsSummary();
    expect(summary.visits.total).toBe(2);
    expect(summary.duration.totalSeconds).toBe(420);
    expect(summary.duration.averageSeconds).toBe(210);
    expect(summary.devices.desktop).toBe(1);
    expect(summary.devices.mobile).toBe(1);
  });

  it('allows admin to manage user accounts and reset passwords', () => {
    const { user } = createServerUser({
      email: 'member@havenart.space',
      name: 'Test Member',
      password: 'password123',
    });

    // Suspend user
    const updated = updateUserStatus(user.id, 'suspended');
    expect(updated).toBe(true);
    expect(findUserByEmail('member@havenart.space')?.status).toBe('suspended');

    // Reset password and reactivate
    const reset = resetUserPassword(user.id, 'new_secret_pass_2026');
    expect(reset).toBe(true);

    // Suspended user cannot login
    expect(() => authenticateUser('member@havenart.space', 'new_secret_pass_2026')).toThrow('tạm khóa');

    // Reactivate user
    updateUserStatus(user.id, 'active');
    const auth = authenticateUser('member@havenart.space', 'new_secret_pass_2026');
    expect(auth).not.toBeNull();

    // Delete user
    const deleted = deleteUser(user.id);
    expect(deleted).toBe(true);
    expect(findUserByEmail('member@havenart.space')).toBeUndefined();
  });

  it('exports and imports server database with validation', () => {
    createServerUser({
      email: 'export_user@havenart.space',
      name: 'Export User',
      password: 'password123',
    });

    const exported = exportServerDatabase();
    expect(exported.version).toBe(2);
    expect(exported.users.some((u) => u.email === 'export_user@havenart.space')).toBe(true);

    // Import exported DB
    const importResult = importServerDatabase(exported);
    expect(importResult.success).toBe(true);
    expect(readServerDatabase().users.length).toBeGreaterThan(0);
  });
});
