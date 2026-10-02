import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  passwordHash: string;
  salt: string;
  token?: string;
  createdAt: number;
  lastLoginAt?: number;
  lastActiveAt?: number;
}

export interface ServerJournalEntry {
  id: string;
  userId: string;
  title?: string;
  body: string;
  mood?: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncedAt: number;
}

export interface ServerFeedback {
  id: string;
  userId?: string | null;
  userName: string;
  userEmail?: string;
  rating: number; // 1 to 5
  category: 'peace' | 'music' | 'visuals' | 'journal' | 'general';
  comment: string;
  device?: string;
  createdAt: number;
}

export interface ServerSession {
  id: string;
  sessionId: string;
  userId?: string | null;
  durationSeconds: number;
  pageViews: number;
  device: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  language?: string;
  ip?: string;
  startTime: number;
  lastPingAt: number;
}

export interface ServerSettings {
  id: 'system';
  siteName: string;
  pixabayApiKey?: string;
  unsplashApiKey?: string;
  pexelsApiKey?: string;
  allowRegistration: boolean;
  updatedAt: number;
}

export interface ServerDatabaseSchema {
  version: number;
  users: ServerUser[];
  entries: ServerJournalEntry[];
  feedbacks: ServerFeedback[];
  sessions: ServerSession[];
  settings?: ServerSettings;
}

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data', 'server-db.json');
export const DEFAULT_ADMIN_EMAIL = 'admin@havenart.space';
export const DEFAULT_ADMIN_PASSWORD = 'havenart@2026';

/**
 * Returns database file path.
 */
export function getServerDbPath(): string {
  return process.env.HAVEN_SERVER_DB_PATH || DEFAULT_DB_PATH;
}

/**
 * Hash password with PBKDF2 (SHA-256) and salt.
 */
export function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha256')
    .toString('hex');
}

export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Seed default admin if no admin user exists.
 */
function ensureDefaultAdmin(users: ServerUser[]): boolean {
  const hasAdmin = users.some((u) => u.role === 'admin' || u.email.toLowerCase() === 'admin' || u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL);
  if (!hasAdmin) {
    const salt = generateSalt();
    const passwordHash = hashPassword(DEFAULT_ADMIN_PASSWORD, salt);
    users.unshift({
      id: 'usr_admin_root',
      email: DEFAULT_ADMIN_EMAIL,
      name: 'Haven Administrator',
      role: 'admin',
      status: 'active',
      passwordHash,
      salt,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
    return true;
  }
  return false;
}

/**
 * Reads server database with schema migration and default admin seeding.
 */
export function readServerDatabase(): ServerDatabaseSchema {
  const filePath = getServerDbPath();
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const initialUsers: ServerUser[] = [];
      ensureDefaultAdmin(initialUsers);

      const initial: ServerDatabaseSchema = {
        version: 2,
        users: initialUsers,
        entries: [],
        feedbacks: [],
        sessions: [],
        settings: {
          id: 'system',
          siteName: 'Haven Art',
          allowRegistration: true,
          updatedAt: Date.now(),
        },
      };
      fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    const users: ServerUser[] = Array.isArray(parsed.users) ? parsed.users : [];
    // Ensure existing users have role & status
    for (const u of users) {
      if (!u.role) u.role = (u.email.toLowerCase().includes('admin') ? 'admin' : 'user');
      if (!u.status) u.status = 'active';
    }

    let modified = ensureDefaultAdmin(users);

    const schema: ServerDatabaseSchema = {
      version: 2,
      users,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      settings: parsed.settings || {
        id: 'system',
        siteName: 'Haven Art',
        allowRegistration: true,
        updatedAt: Date.now(),
      },
    };

    if (modified || parsed.version !== 2 || !Array.isArray(parsed.feedbacks) || !Array.isArray(parsed.sessions)) {
      writeServerDatabase(schema);
    }

    return schema;
  } catch (err) {
    console.error('Lỗi đọc cơ sở dữ liệu server:', err);
    const fallbackUsers: ServerUser[] = [];
    ensureDefaultAdmin(fallbackUsers);
    return {
      version: 2,
      users: fallbackUsers,
      entries: [],
      feedbacks: [],
      sessions: [],
      settings: {
        id: 'system',
        siteName: 'Haven Art',
        allowRegistration: true,
        updatedAt: Date.now(),
      },
    };
  }
}

/**
 * Writes data safely to the database file.
 */
export function writeServerDatabase(data: ServerDatabaseSchema): void {
  const filePath = getServerDbPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/* ========================================================================= */
/*                          1. USER MANAGEMENT                               */
/* ========================================================================= */

export function findUserByEmail(email: string): ServerUser | undefined {
  const db = readServerDatabase();
  const normalized = email.trim().toLowerCase();
  return db.users.find(
    (u) =>
      u.email.toLowerCase() === normalized ||
      (normalized === 'admin' && (u.email === DEFAULT_ADMIN_EMAIL || u.role === 'admin'))
  );
}

export function findUserByToken(token: string): ServerUser | undefined {
  if (!token) return undefined;
  const db = readServerDatabase();
  return db.users.find((u) => u.token === token && u.status === 'active');
}

export function createServerUser(params: {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'user';
}): { user: ServerUser; token: string } {
  const db = readServerDatabase();
  const normalized = params.email.trim().toLowerCase();

  if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
    throw new Error('Email này đã được đăng ký tài khoản.');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(params.password, salt);
  const token = generateToken();
  const id = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const newUser: ServerUser = {
    id,
    email: normalized,
    name: params.name.trim() || normalized.split('@')[0],
    role: params.role || 'user',
    status: 'active',
    passwordHash,
    salt,
    token,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    lastActiveAt: Date.now(),
  };

  db.users.push(newUser);
  writeServerDatabase(db);

  return { user: newUser, token };
}

export function authenticateUser(
  emailOrUsername: string,
  password: string
): { user: ServerUser; token: string } | null {
  const db = readServerDatabase();
  const normalized = (emailOrUsername || '').trim().toLowerCase();

  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === normalized ||
      (normalized === 'admin' && (u.email === DEFAULT_ADMIN_EMAIL || u.role === 'admin'))
  );

  if (!user) return null;
  if (user.status === 'suspended') {
    throw new Error('Tài khoản đã bị tạm khóa bởi quản trị viên.');
  }

  const expectedHash = hashPassword(password, user.salt);
  if (crypto.timingSafeEqual(Buffer.from(user.passwordHash), Buffer.from(expectedHash))) {
    const newToken = generateToken();
    user.token = newToken;
    user.lastLoginAt = Date.now();
    user.lastActiveAt = Date.now();
    writeServerDatabase(db);
    return { user, token: newToken };
  }

  return null;
}

export interface SafeServerUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  createdAt: number;
  lastLoginAt?: number;
  lastActiveAt?: number;
  entriesCount: number;
  totalWords: number;
}

export function getAllUsers(): SafeServerUser[] {
  const db = readServerDatabase();
  return db.users.map((u) => {
    const userEntries = db.entries.filter((e) => e.userId === u.id && e.deletedAt === null);
    const totalWords = userEntries.reduce((sum, e) => sum + (e.wordCount || 0), 0);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      lastActiveAt: u.lastActiveAt,
      entriesCount: userEntries.length,
      totalWords,
    };
  });
}

export function updateUserStatus(userId: string, status: 'active' | 'suspended'): boolean {
  const db = readServerDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  user.status = status;
  if (status === 'suspended') {
    user.token = undefined; // revoke session
  }
  writeServerDatabase(db);
  return true;
}

export function updateUserRole(userId: string, role: 'admin' | 'user'): boolean {
  const db = readServerDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  user.role = role;
  writeServerDatabase(db);
  return true;
}

export function resetUserPassword(userId: string, newPassword: string): boolean {
  const db = readServerDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  user.salt = generateSalt();
  user.passwordHash = hashPassword(newPassword, user.salt);
  user.token = undefined; // revoke existing session
  writeServerDatabase(db);
  return true;
}

export function deleteUser(userId: string): boolean {
  const db = readServerDatabase();
  const userIndex = db.users.findIndex((u) => u.id === userId);
  if (userIndex === -1) return false;

  // Prevent deleting primary root admin if it's the last admin
  const user = db.users[userIndex];
  if (user.role === 'admin') {
    const adminCount = db.users.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error('Không thể xóa quản trị viên duy nhất của hệ thống.');
    }
  }

  db.users.splice(userIndex, 1);
  // Remove user entries
  db.entries = db.entries.filter((e) => e.userId !== userId);
  writeServerDatabase(db);
  return true;
}

/* ========================================================================= */
/*                        2. JOURNAL ENTRIES ON SERVER                       */
/* ========================================================================= */

export function upsertServerEntries(
  userId: string,
  entries: Array<{
    id: string;
    title?: string;
    body: string;
    mood?: string;
    createdAt?: number;
    updatedAt?: number;
    deletedAt?: number | null;
  }>
): { syncedCount: number; totalCount: number } {
  const db = readServerDatabase();
  let syncedCount = 0;
  const now = Date.now();

  for (const item of entries) {
    if (!item.id || !item.body) continue;

    const existingIndex = db.entries.findIndex(
      (e) => e.userId === userId && e.id === item.id
    );

    const wordCount = item.body.trim().split(/\s+/).filter(Boolean).length;

    const record: ServerJournalEntry = {
      id: item.id,
      userId,
      title: item.title || '',
      body: item.body,
      mood: item.mood || 'calm',
      wordCount,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
      deletedAt: item.deletedAt ?? null,
      syncedAt: now,
    };

    if (existingIndex >= 0) {
      if (record.updatedAt >= db.entries[existingIndex].updatedAt) {
        db.entries[existingIndex] = record;
        syncedCount++;
      }
    } else {
      db.entries.push(record);
      syncedCount++;
    }
  }

  // Update user lastActiveAt
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    user.lastActiveAt = now;
  }

  writeServerDatabase(db);

  const totalCount = db.entries.filter(
    (e) => e.userId === userId && e.deletedAt === null
  ).length;

  return { syncedCount, totalCount };
}

export function getUserServerEntries(userId: string): ServerJournalEntry[] {
  const db = readServerDatabase();
  return db.entries
    .filter((e) => e.userId === userId && e.deletedAt === null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export interface DetailedServerEntry extends ServerJournalEntry {
  authorName: string;
  authorEmail: string;
}

export function getAllServerEntries(): DetailedServerEntry[] {
  const db = readServerDatabase();
  const userMap = new Map(db.users.map((u) => [u.id, u]));

  return db.entries
    .filter((e) => e.deletedAt === null)
    .map((e) => {
      const user = userMap.get(e.userId);
      return {
        ...e,
        authorName: user?.name || 'Vô danh',
        authorEmail: user?.email || 'N/A',
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteServerEntry(entryId: string): boolean {
  const db = readServerDatabase();
  const idx = db.entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return false;
  db.entries.splice(idx, 1);
  writeServerDatabase(db);
  return true;
}

export function purgeSoftDeletedEntries(): number {
  const db = readServerDatabase();
  const beforeCount = db.entries.length;
  db.entries = db.entries.filter((e) => e.deletedAt === null);
  const purged = beforeCount - db.entries.length;
  if (purged > 0) {
    writeServerDatabase(db);
  }
  return purged;
}

/* ========================================================================= */
/*                      3. USER FEEDBACKS & REVIEWS                          */
/* ========================================================================= */

export function addServerFeedback(input: {
  userId?: string | null;
  userName?: string;
  userEmail?: string;
  rating: number;
  category?: 'peace' | 'music' | 'visuals' | 'journal' | 'general';
  comment: string;
  device?: string;
}): ServerFeedback {
  const db = readServerDatabase();

  const rating = Math.min(5, Math.max(1, Math.round(input.rating || 5)));
  const id = `fb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  let name = input.userName?.trim();
  let email = input.userEmail?.trim();

  if (input.userId) {
    const user = db.users.find((u) => u.id === input.userId);
    if (user) {
      if (!name) name = user.name;
      if (!email) email = user.email;
    }
  }

  const feedback: ServerFeedback = {
    id,
    userId: input.userId || null,
    userName: name || 'Người dùng Haven',
    userEmail: email,
    rating,
    category: input.category || 'general',
    comment: input.comment?.trim() || '',
    device: input.device || 'web',
    createdAt: Date.now(),
  };

  db.feedbacks.unshift(feedback);
  writeServerDatabase(db);

  return feedback;
}

export function getAllServerFeedbacks(): ServerFeedback[] {
  const db = readServerDatabase();
  return [...db.feedbacks].sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteServerFeedback(id: string): boolean {
  const db = readServerDatabase();
  const idx = db.feedbacks.findIndex((f) => f.id === id);
  if (idx === -1) return false;
  db.feedbacks.splice(idx, 1);
  writeServerDatabase(db);
  return true;
}

export function getFeedbackStats(): {
  averageRating: number;
  totalCount: number;
  distribution: Record<number, number>;
} {
  const feedbacks = getAllServerFeedbacks();
  const totalCount = feedbacks.length;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (totalCount === 0) {
    return { averageRating: 5.0, totalCount: 0, distribution };
  }

  let totalStars = 0;
  for (const fb of feedbacks) {
    const star = Math.min(5, Math.max(1, fb.rating));
    distribution[star] = (distribution[star] || 0) + 1;
    totalStars += star;
  }

  const averageRating = Number((totalStars / totalCount).toFixed(1));
  return { averageRating, totalCount, distribution };
}

/* ========================================================================= */
/*                    4. SESSIONS & TRAFFIC ANALYTICS                        */
/* ========================================================================= */

export function recordServerSession(input: {
  sessionId: string;
  userId?: string | null;
  durationSeconds: number;
  pageViews?: number;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  language?: string;
  ip?: string;
}): ServerSession {
  const db = readServerDatabase();
  const now = Date.now();

  const existingIdx = db.sessions.findIndex((s) => s.sessionId === input.sessionId);

  if (existingIdx >= 0) {
    const s = db.sessions[existingIdx];
    s.durationSeconds = Math.max(s.durationSeconds, Math.round(input.durationSeconds || 0));
    s.pageViews = Math.max(s.pageViews, input.pageViews || 1);
    s.lastPingAt = now;
    if (input.userId) s.userId = input.userId;
    writeServerDatabase(db);
    return s;
  }

  const session: ServerSession = {
    id: `ses_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    sessionId: input.sessionId,
    userId: input.userId || null,
    durationSeconds: Math.round(input.durationSeconds || 0),
    pageViews: input.pageViews || 1,
    device: input.device || 'desktop',
    browser: input.browser,
    os: input.os,
    language: input.language || 'vi',
    ip: input.ip,
    startTime: now,
    lastPingAt: now,
  };

  db.sessions.unshift(session);
  // Keep last 1,000 sessions to keep database light
  if (db.sessions.length > 1000) {
    db.sessions = db.sessions.slice(0, 1000);
  }

  writeServerDatabase(db);
  return session;
}

export function getAllServerSessions(limit = 100): ServerSession[] {
  const db = readServerDatabase();
  return db.sessions.slice(0, limit);
}

export function getServerAnalyticsSummary(): {
  visits: {
    total: number;
    today: number;
    thisWeek: number;
  };
  duration: {
    averageSeconds: number;
    totalSeconds: number;
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  users: {
    total: number;
    activeToday: number;
  };
  journal: {
    totalEntries: number;
    totalWords: number;
    moodBreakdown: Record<string, number>;
  };
} {
  const db = readServerDatabase();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const totalSessions = db.sessions.length;
  const todaySessions = db.sessions.filter((s) => s.startTime >= oneDayAgo).length;
  const weekSessions = db.sessions.filter((s) => s.startTime >= oneWeekAgo).length;

  let totalDurationSec = 0;
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };

  for (const s of db.sessions) {
    totalDurationSec += s.durationSeconds || 0;
    if (s.device === 'mobile') deviceCounts.mobile++;
    else if (s.device === 'tablet') deviceCounts.tablet++;
    else deviceCounts.desktop++;
  }

  const avgDuration = totalSessions > 0 ? Math.round(totalDurationSec / totalSessions) : 0;

  // Active users today
  const activeTodayUsers = db.users.filter((u) => u.lastActiveAt && u.lastActiveAt >= oneDayAgo).length;

  // Journal entries summary
  const activeEntries = db.entries.filter((e) => e.deletedAt === null);
  let totalWords = 0;
  const moodBreakdown: Record<string, number> = {
    calm: 0,
    joyful: 0,
    reflective: 0,
    melancholy: 0,
    hopeful: 0,
  };

  for (const e of activeEntries) {
    totalWords += e.wordCount || 0;
    const m = e.mood || 'calm';
    moodBreakdown[m] = (moodBreakdown[m] || 0) + 1;
  }

  return {
    visits: {
      total: totalSessions,
      today: todaySessions,
      thisWeek: weekSessions,
    },
    duration: {
      averageSeconds: avgDuration,
      totalSeconds: totalDurationSec,
    },
    devices: deviceCounts,
    users: {
      total: db.users.length,
      activeToday: activeTodayUsers,
    },
    journal: {
      totalEntries: activeEntries.length,
      totalWords,
      moodBreakdown,
    },
  };
}

/* ========================================================================= */
/*                      5. DATABASE METRICS & BACKUP                         */
/* ========================================================================= */

export function getServerDbStats(): {
  filePath: string;
  fileSizeBytes: number;
  totalUsers: number;
  totalEntries: number;
  totalFeedbacks: number;
  totalSessions: number;
  version: number;
  lastModifiedMs: number;
} {
  const filePath = getServerDbPath();
  const db = readServerDatabase();
  let fileSizeBytes = 0;
  let lastModifiedMs = Date.now();

  try {
    const stat = fs.statSync(filePath);
    fileSizeBytes = stat.size;
    lastModifiedMs = stat.mtimeMs;
  } catch {
    // Ignore
  }

  return {
    filePath,
    fileSizeBytes,
    totalUsers: db.users.length,
    totalEntries: db.entries.length,
    totalFeedbacks: db.feedbacks.length,
    totalSessions: db.sessions.length,
    version: db.version,
    lastModifiedMs,
  };
}

export function exportServerDatabase(): ServerDatabaseSchema {
  return readServerDatabase();
}

export function importServerDatabase(incoming: any): {
  success: boolean;
  usersImported: number;
  entriesImported: number;
  feedbacksImported: number;
} {
  if (!incoming || typeof incoming !== 'object') {
    throw new Error('Dữ liệu sao lưu không hợp lệ.');
  }

  const current = readServerDatabase();

  const newUsers = Array.isArray(incoming.users) ? incoming.users : [];
  const newEntries = Array.isArray(incoming.entries) ? incoming.entries : [];
  const newFeedbacks = Array.isArray(incoming.feedbacks) ? incoming.feedbacks : [];

  // Merge users by email
  let usersCount = 0;
  for (const nu of newUsers) {
    if (!nu.email) continue;
    const exists = current.users.findIndex((u) => u.email.toLowerCase() === nu.email.toLowerCase());
    if (exists >= 0) {
      current.users[exists] = { ...current.users[exists], ...nu };
    } else {
      current.users.push(nu);
      usersCount++;
    }
  }

  // Merge entries by id
  let entriesCount = 0;
  for (const ne of newEntries) {
    if (!ne.id) continue;
    const exists = current.entries.findIndex((e) => e.id === ne.id);
    if (exists >= 0) {
      current.entries[exists] = { ...current.entries[exists], ...ne };
    } else {
      current.entries.push(ne);
      entriesCount++;
    }
  }

  // Merge feedbacks by id
  let feedbacksCount = 0;
  for (const nf of newFeedbacks) {
    if (!nf.id) continue;
    const exists = current.feedbacks.findIndex((f) => f.id === nf.id);
    if (exists >= 0) {
      current.feedbacks[exists] = { ...current.feedbacks[exists], ...nf };
    } else {
      current.feedbacks.push(nf);
      feedbacksCount++;
    }
  }

  ensureDefaultAdmin(current.users);
  writeServerDatabase(current);

  return {
    success: true,
    usersImported: usersCount,
    entriesImported: entriesCount,
    feedbacksImported: feedbacksCount,
  };
}
