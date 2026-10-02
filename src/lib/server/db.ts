import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import type { ClientInfo } from './client-info';

/* ========================================================================= */
/*                          INTERFACES & TYPES                               */
/* ========================================================================= */

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  passwordHash: string;
  salt: string;
  token?: string;
  tokens?: string[];
  createdAt: number;
  lastLoginAt?: number;
  lastActiveAt?: number;
  // User Client Telemetry
  createdIp?: string;
  lastIp?: string;
  lastUserAgent?: string;
  lastBrowser?: string;
  lastBrowserVersion?: string;
  lastOs?: string;
  lastDevice?: 'desktop' | 'mobile' | 'tablet';
  lastLanguage?: string;
  loginCount?: number;
}

export interface UserLoginHistoryItem {
  id: string;
  userId: string;
  email: string;
  ip: string;
  userAgent?: string;
  browser: string;
  browserVersion?: string;
  os: string;
  device: 'desktop' | 'mobile' | 'tablet';
  language: string;
  status: 'success' | 'failed';
  timestamp: number;
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
  browser?: string;
  os?: string;
  ip?: string;
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
  // Telemetry metadata
  createdIp?: string;
  lastIp?: string;
  lastUserAgent?: string;
  lastBrowser?: string;
  lastBrowserVersion?: string;
  lastOs?: string;
  lastDevice?: 'desktop' | 'mobile' | 'tablet';
  lastLanguage?: string;
  loginCount?: number;
}

export const DEFAULT_ADMIN_EMAIL = 'admin@havenart.space';
export const DEFAULT_ADMIN_PASSWORD = 'havenart@2026';

/* ========================================================================= */
/*                   DATABASE CONNECTION & SQLITE INITIALIZATION             */
/* ========================================================================= */

let _currentDbPath: string | null = null;
let _dbInstance: DatabaseType | null = null;

export function getServerDbPath(): string {
  return process.env.HAVEN_SERVER_DB_PATH || path.resolve(process.cwd(), 'data', 'server-db.json');
}

export function getSqliteDbPath(): string {
  if (process.env.HAVEN_SQLITE_PATH) {
    return process.env.HAVEN_SQLITE_PATH;
  }
  if (process.env.HAVEN_SERVER_DB_PATH) {
    const raw = process.env.HAVEN_SERVER_DB_PATH;
    if (raw.endsWith('.json')) {
      return raw.slice(0, -5) + '.db';
    }
    return raw;
  }
  return path.resolve(process.cwd(), 'data', 'haven.db');
}

export function closeDatabase(): void {
  if (_dbInstance) {
    try {
      _dbInstance.close();
    } catch {
      // Ignore
    }
    _dbInstance = null;
    _currentDbPath = null;
  }
}

function initSchema(db: DatabaseType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      token TEXT,
      tokens TEXT,
      created_at INTEGER NOT NULL,
      last_login_at INTEGER,
      last_active_at INTEGER,
      created_ip TEXT,
      last_ip TEXT,
      last_user_agent TEXT,
      last_browser TEXT,
      last_browser_version TEXT,
      last_os TEXT,
      last_device TEXT,
      last_language TEXT,
      login_count INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS login_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      browser TEXT,
      browser_version TEXT,
      os TEXT,
      device TEXT,
      language TEXT,
      status TEXT DEFAULT 'success',
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      body TEXT NOT NULL,
      mood TEXT,
      word_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      synced_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      user_email TEXT,
      rating INTEGER NOT NULL,
      category TEXT DEFAULT 'peace',
      comment TEXT NOT NULL,
      device TEXT,
      browser TEXT,
      os TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      duration_seconds INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 1,
      device TEXT DEFAULT 'desktop',
      browser TEXT,
      browser_version TEXT,
      os TEXT,
      language TEXT,
      ip TEXT,
      start_time INTEGER NOT NULL,
      last_ping_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      site_name TEXT DEFAULT 'Haven Art',
      pixabay_api_key TEXT,
      unsplash_api_key TEXT,
      pexels_api_key TEXT,
      allow_registration INTEGER DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
    CREATE INDEX IF NOT EXISTS idx_entries_user ON journal_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_user ON login_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_id ON sessions(session_id);
  `);
}

function ensureDefaultAdmin(db: DatabaseType): void {
  const admin = db
    .prepare("SELECT * FROM users WHERE role = 'admin' OR lower(email) = lower(?)")
    .get(DEFAULT_ADMIN_EMAIL);

  if (!admin) {
    const salt = generateSalt();
    const passwordHash = hashPassword(DEFAULT_ADMIN_PASSWORD, salt);
    const token = generateToken();
    db.prepare(`
      INSERT INTO users (
        id, email, name, role, status, password_hash, salt, token, tokens,
        created_at, last_login_at, last_active_at, created_ip, last_ip,
        last_browser, last_os, last_device, last_language, login_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'usr_admin_root',
      DEFAULT_ADMIN_EMAIL,
      'Haven Administrator',
      'admin',
      'active',
      passwordHash,
      salt,
      token,
      JSON.stringify([token]),
      Date.now(),
      Date.now(),
      Date.now(),
      '127.0.0.1',
      '127.0.0.1',
      'System',
      'Server',
      'desktop',
      'vi-VN',
      1
    );
  }
}

function migrateFromJsonIfEmpty(db: DatabaseType): void {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
  if (userCount > 0) return;

  const jsonPath = getServerDbPath();
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const data: ServerDatabaseSchema = JSON.parse(raw);
      if (Array.isArray(data.users) && data.users.length > 0) {
        const insertUser = db.prepare(`
          INSERT INTO users (
            id, email, name, role, status, password_hash, salt, token, tokens,
            created_at, last_login_at, last_active_at, created_ip, last_ip,
            last_browser, last_os, last_device, last_language, login_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const u of data.users) {
          insertUser.run(
            u.id,
            u.email,
            u.name,
            u.role || 'user',
            u.status || 'active',
            u.passwordHash,
            u.salt,
            u.token || null,
            JSON.stringify(u.tokens || (u.token ? [u.token] : [])),
            u.createdAt || Date.now(),
            u.lastLoginAt || null,
            u.lastActiveAt || null,
            (u as any).createdIp || null,
            (u as any).lastIp || null,
            (u as any).lastBrowser || null,
            (u as any).lastOs || null,
            (u as any).lastDevice || 'desktop',
            (u as any).lastLanguage || 'vi-VN',
            (u as any).loginCount || 1
          );
        }

        if (Array.isArray(data.entries)) {
          const insertEntry = db.prepare(`
            INSERT INTO journal_entries (id, user_id, title, body, mood, word_count, created_at, updated_at, deleted_at, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const e of data.entries) {
            insertEntry.run(
              e.id,
              e.userId,
              e.title || null,
              e.body,
              e.mood || null,
              e.wordCount || 0,
              e.createdAt,
              e.updatedAt,
              e.deletedAt ?? null,
              e.syncedAt || Date.now()
            );
          }
        }

        if (Array.isArray(data.feedbacks)) {
          const insertFb = db.prepare(`
            INSERT INTO feedbacks (id, user_id, user_name, user_email, rating, category, comment, device, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const f of data.feedbacks) {
            insertFb.run(
              f.id,
              f.userId || null,
              f.userName,
              f.userEmail || null,
              f.rating,
              f.category || 'peace',
              f.comment,
              f.device || null,
              f.createdAt
            );
          }
        }

        if (Array.isArray(data.sessions)) {
          const insertSession = db.prepare(`
            INSERT INTO sessions (id, session_id, user_id, duration_seconds, page_views, device, browser, os, language, ip, start_time, last_ping_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const s of data.sessions) {
            insertSession.run(
              s.id,
              s.sessionId,
              s.userId || null,
              s.durationSeconds || 0,
              s.pageViews || 1,
              s.device || 'desktop',
              s.browser || null,
              s.os || null,
              s.language || null,
              s.ip || null,
              s.startTime || Date.now(),
              s.lastPingAt || Date.now()
            );
          }
        }

        if (data.settings) {
          const insertSettings = db.prepare(`
            INSERT OR REPLACE INTO settings (id, site_name, pixabay_api_key, unsplash_api_key, pexels_api_key, allow_registration, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          insertSettings.run(
            'system',
            data.settings.siteName || 'Haven Art',
            data.settings.pixabayApiKey || null,
            data.settings.unsplashApiKey || null,
            data.settings.pexelsApiKey || null,
            data.settings.allowRegistration ? 1 : 0,
            data.settings.updatedAt || Date.now()
          );
        }

        return;
      }
    } catch (err) {
      console.warn('Lỗi migrate dữ liệu từ JSON sang SQLite:', err);
    }
  }

  ensureDefaultAdmin(db);
}

export function getDatabase(): DatabaseType {
  const dbPath = getSqliteDbPath();

  if (_dbInstance && _currentDbPath === dbPath) {
    return _dbInstance;
  }

  if (_dbInstance) {
    closeDatabase();
  }

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  migrateFromJsonIfEmpty(db);

  _dbInstance = db;
  _currentDbPath = dbPath;

  return _dbInstance;
}

let _isSyncing = false;
export function syncToJsonBackup(db?: DatabaseType): void {
  if (_isSyncing) return;
  _isSyncing = true;
  try {
    const targetDb = db || (_dbInstance ? _dbInstance : getDatabase());
    const jsonPath = getServerDbPath();
    const dir = path.dirname(jsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const schema = readDatabaseFromDb(targetDb);
    fs.writeFileSync(jsonPath, JSON.stringify(schema, null, 2), 'utf-8');
  } catch {
    // Ignore backup write failure
  } finally {
    _isSyncing = false;
  }
}

/* ========================================================================= */
/*                   CRYPTOGRAPHY & TOKEN HELPERS                            */
/* ========================================================================= */

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
}

export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/* ========================================================================= */
/*                   JSON DATABASE COMPATIBILITY API                         */
/* ========================================================================= */

export function readDatabaseFromDb(db: DatabaseType): ServerDatabaseSchema {
  // Users
  const userRows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as any[];
  const users: ServerUser[] = userRows.map((r) => {
    let tokens: string[] = [];
    try {
      tokens = r.tokens ? JSON.parse(r.tokens) : r.token ? [r.token] : [];
    } catch {
      tokens = r.token ? [r.token] : [];
    }
    return {
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status,
      passwordHash: r.password_hash,
      salt: r.salt,
      token: r.token || undefined,
      tokens,
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at || undefined,
      lastActiveAt: r.last_active_at || undefined,
      createdIp: r.created_ip || undefined,
      lastIp: r.last_ip || undefined,
      lastUserAgent: r.last_user_agent || undefined,
      lastBrowser: r.last_browser || undefined,
      lastBrowserVersion: r.last_browser_version || undefined,
      lastOs: r.last_os || undefined,
      lastDevice: r.last_device || undefined,
      lastLanguage: r.last_language || undefined,
      loginCount: r.login_count || 1,
    };
  });

  // Entries
  const entryRows = db
    .prepare('SELECT * FROM journal_entries ORDER BY created_at DESC')
    .all() as any[];
  const entries: ServerJournalEntry[] = entryRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title || undefined,
    body: r.body,
    mood: r.mood || undefined,
    wordCount: r.word_count || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
    syncedAt: r.synced_at,
  }));

  // Feedbacks
  const fbRows = db
    .prepare('SELECT * FROM feedbacks ORDER BY created_at DESC')
    .all() as any[];
  const feedbacks: ServerFeedback[] = fbRows.map((r) => ({
    id: r.id,
    userId: r.user_id || null,
    userName: r.user_name,
    userEmail: r.user_email || undefined,
    rating: r.rating,
    category: r.category,
    comment: r.comment,
    device: r.device || undefined,
    browser: r.browser || undefined,
    os: r.os || undefined,
    ip: r.ip || undefined,
    createdAt: r.created_at,
  }));

  // Sessions
  const sessionRows = db
    .prepare('SELECT * FROM sessions ORDER BY start_time DESC')
    .all() as any[];
  const sessions: ServerSession[] = sessionRows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    userId: r.user_id || null,
    durationSeconds: r.duration_seconds,
    pageViews: r.page_views,
    device: r.device,
    browser: r.browser || undefined,
    os: r.os || undefined,
    language: r.language || undefined,
    ip: r.ip || undefined,
    startTime: r.start_time,
    lastPingAt: r.last_ping_at,
  }));

  // Settings
  const settingsRow = db.prepare('SELECT * FROM settings WHERE id = ?').get('system') as any;
  const settings: ServerSettings = settingsRow
    ? {
        id: 'system',
        siteName: settingsRow.site_name,
        pixabayApiKey: settingsRow.pixabay_api_key || undefined,
        unsplashApiKey: settingsRow.unsplash_api_key || undefined,
        pexelsApiKey: settingsRow.pexels_api_key || undefined,
        allowRegistration: !!settingsRow.allow_registration,
        updatedAt: settingsRow.updated_at,
      }
    : {
        id: 'system',
        siteName: 'Haven Art',
        allowRegistration: true,
        updatedAt: Date.now(),
      };

  return {
    version: 2,
    users,
    entries,
    feedbacks,
    sessions,
    settings,
  };
}

export function readServerDatabase(): ServerDatabaseSchema {
  const db = getDatabase();
  const schema = readDatabaseFromDb(db);
  const jsonPath = getServerDbPath();
  if (!fs.existsSync(jsonPath)) {
    syncToJsonBackup(db);
  }
  return schema;
}

export function writeServerDatabase(data: ServerDatabaseSchema): void {
  const db = getDatabase();

  const syncTx = db.transaction(() => {
    // Upsert users
    const upsertUser = db.prepare(`
      INSERT INTO users (
        id, email, name, role, status, password_hash, salt, token, tokens,
        created_at, last_login_at, last_active_at, created_ip, last_ip,
        last_browser, last_os, last_device, last_language, login_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email=excluded.email,
        name=excluded.name,
        role=excluded.role,
        status=excluded.status,
        password_hash=excluded.password_hash,
        salt=excluded.salt,
        token=excluded.token,
        tokens=excluded.tokens,
        last_login_at=excluded.last_login_at,
        last_active_at=excluded.last_active_at
    `);

    for (const u of data.users) {
      upsertUser.run(
        u.id,
        u.email,
        u.name,
        u.role || 'user',
        u.status || 'active',
        u.passwordHash,
        u.salt,
        u.token || null,
        JSON.stringify(u.tokens || (u.token ? [u.token] : [])),
        u.createdAt || Date.now(),
        u.lastLoginAt || null,
        u.lastActiveAt || null,
        u.createdIp || null,
        u.lastIp || null,
        u.lastBrowser || null,
        u.lastOs || null,
        u.lastDevice || 'desktop',
        u.lastLanguage || 'vi-VN',
        u.loginCount || 1
      );
    }

    // Upsert entries
    const upsertEntry = db.prepare(`
      INSERT INTO journal_entries (id, user_id, title, body, mood, word_count, created_at, updated_at, deleted_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        body=excluded.body,
        mood=excluded.mood,
        word_count=excluded.word_count,
        updated_at=excluded.updated_at,
        deleted_at=excluded.deleted_at,
        synced_at=excluded.synced_at
    `);

    for (const e of data.entries) {
      upsertEntry.run(
        e.id,
        e.userId,
        e.title || null,
        e.body,
        e.mood || null,
        e.wordCount || 0,
        e.createdAt,
        e.updatedAt,
        e.deletedAt ?? null,
        e.syncedAt || Date.now()
      );
    }
  });

  syncTx();
  syncToJsonBackup(db);
}

/* ========================================================================= */
/*                          1. USER MANAGEMENT                               */
/* ========================================================================= */

export function findUserByEmail(email: string): ServerUser | undefined {
  const db = getDatabase();
  const normalized = email.trim().toLowerCase();

  const row = db
    .prepare(
      `
    SELECT * FROM users
    WHERE lower(email) = lower(?)
       OR (lower(?) = 'admin' AND (email = ? OR role = 'admin'))
    LIMIT 1
  `
    )
    .get(normalized, normalized, DEFAULT_ADMIN_EMAIL) as any;

  if (!row) return undefined;

  let tokens: string[] = [];
  try {
    tokens = row.tokens ? JSON.parse(row.tokens) : row.token ? [row.token] : [];
  } catch {
    tokens = row.token ? [row.token] : [];
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash,
    salt: row.salt,
    token: row.token || undefined,
    tokens,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || undefined,
    lastActiveAt: row.last_active_at || undefined,
    createdIp: row.created_ip || undefined,
    lastIp: row.last_ip || undefined,
    lastUserAgent: row.last_user_agent || undefined,
    lastBrowser: row.last_browser || undefined,
    lastBrowserVersion: row.last_browser_version || undefined,
    lastOs: row.last_os || undefined,
    lastDevice: row.last_device || undefined,
    lastLanguage: row.last_language || undefined,
    loginCount: row.login_count || 1,
  };
}

export function findUserByToken(token: string): ServerUser | undefined {
  if (!token) return undefined;
  const db = getDatabase();

  const row = db
    .prepare(
      `
    SELECT * FROM users
    WHERE status = 'active'
      AND (token = ? OR tokens LIKE ?)
    LIMIT 1
  `
    )
    .get(token, `%"${token}"%`) as any;

  if (!row) return undefined;

  let tokens: string[] = [];
  try {
    tokens = row.tokens ? JSON.parse(row.tokens) : row.token ? [row.token] : [];
  } catch {
    tokens = row.token ? [row.token] : [];
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash,
    salt: row.salt,
    token: row.token || undefined,
    tokens,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || undefined,
    lastActiveAt: row.last_active_at || undefined,
    createdIp: row.created_ip || undefined,
    lastIp: row.last_ip || undefined,
    lastUserAgent: row.last_user_agent || undefined,
    lastBrowser: row.last_browser || undefined,
    lastBrowserVersion: row.last_browser_version || undefined,
    lastOs: row.last_os || undefined,
    lastDevice: row.last_device || undefined,
    lastLanguage: row.last_language || undefined,
    loginCount: row.login_count || 1,
  };
}

export function createServerUser(params: {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'user';
  clientInfo?: ClientInfo;
}): { user: ServerUser; token: string } {
  const db = getDatabase();
  const normalized = params.email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(normalized);
  if (existing) {
    throw new Error('Email này đã được đăng ký tài khoản.');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(params.password, salt);
  const token = generateToken();
  const id = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = Date.now();

  const ci = params.clientInfo;
  const createdIp = ci?.ip || '127.0.0.1';
  const lastUserAgent = ci?.userAgent || 'Unknown';
  const lastBrowser = ci?.browser || 'Browser';
  const lastBrowserVersion = ci?.browserVersion || '';
  const lastOs = ci?.os || 'OS';
  const lastDevice = ci?.device || 'desktop';
  const lastLanguage = ci?.language || 'vi-VN';

  db.prepare(`
    INSERT INTO users (
      id, email, name, role, status, password_hash, salt, token, tokens,
      created_at, last_login_at, last_active_at, created_ip, last_ip,
      last_user_agent, last_browser, last_browser_version, last_os,
      last_device, last_language, login_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    normalized,
    params.name.trim() || normalized.split('@')[0],
    params.role || 'user',
    'active',
    passwordHash,
    salt,
    token,
    JSON.stringify([token]),
    now,
    now,
    now,
    createdIp,
    createdIp,
    lastUserAgent,
    lastBrowser,
    lastBrowserVersion,
    lastOs,
    lastDevice,
    lastLanguage,
    1
  );

  // Record into login history
  recordLoginHistory({
    userId: id,
    email: normalized,
    clientInfo: ci,
    status: 'success',
  });

  syncToJsonBackup(db);

  const newUser: ServerUser = {
    id,
    email: normalized,
    name: params.name.trim() || normalized.split('@')[0],
    role: params.role || 'user',
    status: 'active',
    passwordHash,
    salt,
    token,
    tokens: [token],
    createdAt: now,
    lastLoginAt: now,
    lastActiveAt: now,
    createdIp,
    lastIp: createdIp,
    lastUserAgent,
    lastBrowser,
    lastBrowserVersion,
    lastOs,
    lastDevice,
    lastLanguage,
    loginCount: 1,
  };

  return { user: newUser, token };
}

export function recordLoginHistory(params: {
  userId: string;
  email: string;
  clientInfo?: ClientInfo;
  status: 'success' | 'failed';
}): void {
  try {
    const db = getDatabase();
    const id = `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const ci = params.clientInfo;

    db.prepare(`
      INSERT INTO login_history (
        id, user_id, email, ip, user_agent, browser, browser_version, os, device, language, status, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.userId,
      params.email,
      ci?.ip || '127.0.0.1',
      ci?.userAgent || null,
      ci?.browser || 'Unknown',
      ci?.browserVersion || null,
      ci?.os || 'Unknown',
      ci?.device || 'desktop',
      ci?.language || 'vi-VN',
      params.status,
      Date.now()
    );
  } catch {
    // Ignore logging failures
  }
}

export function authenticateUser(
  emailOrUsername: string,
  password: string,
  clientInfo?: ClientInfo
): { user: ServerUser; token: string } | null {
  const db = getDatabase();
  const normalized = (emailOrUsername || '').trim().toLowerCase();

  const user = findUserByEmail(normalized);

  if (!user) {
    recordLoginHistory({
      userId: 'usr_unknown',
      email: normalized,
      clientInfo,
      status: 'failed',
    });
    return null;
  }

  if (user.status === 'suspended') {
    recordLoginHistory({
      userId: user.id,
      email: user.email,
      clientInfo,
      status: 'failed',
    });
    throw new Error('Tài khoản đã bị tạm khóa bởi quản trị viên.');
  }

  const expectedHash = hashPassword(password, user.salt);
  if (!crypto.timingSafeEqual(Buffer.from(user.passwordHash), Buffer.from(expectedHash))) {
    recordLoginHistory({
      userId: user.id,
      email: user.email,
      clientInfo,
      status: 'failed',
    });
    return null;
  }

  const newToken = generateToken();
  const existingTokens = user.tokens || (user.token ? [user.token] : []);
  const updatedTokens = [...existingTokens.filter((t) => t !== newToken), newToken].slice(-10);
  const now = Date.now();

  const ci = clientInfo;
  const lastIp = ci?.ip || user.lastIp || '127.0.0.1';
  const lastUserAgent = ci?.userAgent || user.lastUserAgent || 'Unknown';
  const lastBrowser = ci?.browser || user.lastBrowser || 'Browser';
  const lastBrowserVersion = ci?.browserVersion || user.lastBrowserVersion || '';
  const lastOs = ci?.os || user.lastOs || 'OS';
  const lastDevice = ci?.device || user.lastDevice || 'desktop';
  const lastLanguage = ci?.language || user.lastLanguage || 'vi-VN';
  const loginCount = (user.loginCount || 1) + 1;

  db.prepare(`
    UPDATE users SET
      token = ?,
      tokens = ?,
      last_login_at = ?,
      last_active_at = ?,
      last_ip = ?,
      last_user_agent = ?,
      last_browser = ?,
      last_browser_version = ?,
      last_os = ?,
      last_device = ?,
      last_language = ?,
      login_count = ?
    WHERE id = ?
  `).run(
    newToken,
    JSON.stringify(updatedTokens),
    now,
    now,
    lastIp,
    lastUserAgent,
    lastBrowser,
    lastBrowserVersion,
    lastOs,
    lastDevice,
    lastLanguage,
    loginCount,
    user.id
  );

  recordLoginHistory({
    userId: user.id,
    email: user.email,
    clientInfo,
    status: 'success',
  });

  syncToJsonBackup(db);

  user.token = newToken;
  user.tokens = updatedTokens;
  user.lastLoginAt = now;
  user.lastActiveAt = now;
  user.lastIp = lastIp;
  user.lastBrowser = lastBrowser;
  user.lastBrowserVersion = lastBrowserVersion;
  user.lastOs = lastOs;
  user.lastDevice = lastDevice;
  user.lastLanguage = lastLanguage;
  user.loginCount = loginCount;

  return { user, token: newToken };
}

export function getAllUsers(): SafeServerUser[] {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT
      u.*,
      COUNT(e.id) as entriesCount,
      COALESCE(SUM(e.word_count), 0) as totalWords
    FROM users u
    LEFT JOIN journal_entries e ON e.user_id = u.id AND e.deleted_at IS NULL
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all() as any[];

  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at || undefined,
    lastActiveAt: u.last_active_at || undefined,
    entriesCount: Number(u.entriesCount) || 0,
    totalWords: Number(u.totalWords) || 0,
    createdIp: u.created_ip || undefined,
    lastIp: u.last_ip || undefined,
    lastUserAgent: u.last_user_agent || undefined,
    lastBrowser: u.last_browser || undefined,
    lastBrowserVersion: u.last_browser_version || undefined,
    lastOs: u.last_os || undefined,
    lastDevice: u.last_device || undefined,
    lastLanguage: u.last_language || undefined,
    loginCount: u.login_count || 1,
  }));
}

export function getUserLoginHistory(userId: string, limit = 50): UserLoginHistoryItem[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM login_history
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(userId, limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    email: r.email,
    ip: r.ip,
    userAgent: r.user_agent || undefined,
    browser: r.browser,
    browserVersion: r.browser_version || undefined,
    os: r.os,
    device: r.device,
    language: r.language,
    status: r.status,
    timestamp: r.timestamp,
  }));
}

export function getRecentLoginHistory(limit = 100): UserLoginHistoryItem[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM login_history
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    email: r.email,
    ip: r.ip,
    userAgent: r.user_agent || undefined,
    browser: r.browser,
    browserVersion: r.browser_version || undefined,
    os: r.os,
    device: r.device,
    language: r.language,
    status: r.status,
    timestamp: r.timestamp,
  }));
}

export function updateUserStatus(userId: string, status: 'active' | 'suspended'): boolean {
  const db = getDatabase();
  const res = db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  syncToJsonBackup(db);
  return res.changes > 0;
}

export function updateUserRole(userId: string, role: 'admin' | 'user'): boolean {
  const db = getDatabase();
  const res = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  syncToJsonBackup(db);
  return res.changes > 0;
}

export function resetUserPassword(userId: string, newPass: string): boolean {
  const db = getDatabase();
  const newSalt = generateSalt();
  const newHash = hashPassword(newPass, newSalt);
  const res = db
    .prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
    .run(newHash, newSalt, userId);
  syncToJsonBackup(db);
  return res.changes > 0;
}

export function deleteUser(userId: string): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  syncToJsonBackup(db);
  return res.changes > 0;
}

/* ========================================================================= */
/*                          2. JOURNAL SYNC API                              */
/* ========================================================================= */

export function upsertServerEntries(
  userId: string,
  entries: Array<{
    id: string;
    title?: string;
    body: string;
    mood?: string;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number | null;
  }>
): { syncedCount: number; totalCount: number } {
  const db = getDatabase();
  let syncedCount = 0;
  const now = Date.now();

  const tx = db.transaction(() => {
    const findStmt = db.prepare('SELECT updated_at FROM journal_entries WHERE id = ? AND user_id = ?');
    const updateStmt = db.prepare(`
      UPDATE journal_entries SET
        title = ?,
        body = ?,
        mood = ?,
        word_count = ?,
        updated_at = ?,
        deleted_at = ?,
        synced_at = ?
      WHERE id = ? AND user_id = ?
    `);
    const insertStmt = db.prepare(`
      INSERT INTO journal_entries (id, user_id, title, body, mood, word_count, created_at, updated_at, deleted_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const e of entries) {
      const words = e.body.trim() ? e.body.trim().split(/\s+/).length : 0;
      const existing = findStmt.get(e.id, userId) as any;

      if (existing) {
        if (e.updatedAt >= existing.updated_at) {
          updateStmt.run(
            e.title || null,
            e.body,
            e.mood || null,
            words,
            e.updatedAt,
            e.deletedAt ?? null,
            now,
            e.id,
            userId
          );
          syncedCount++;
        }
      } else {
        insertStmt.run(
          e.id,
          userId,
          e.title || null,
          e.body,
          e.mood || null,
          words,
          e.createdAt,
          e.updatedAt,
          e.deletedAt ?? null,
          now
        );
        syncedCount++;
      }
    }
  });

  tx();
  syncToJsonBackup(db);

  const total = (db.prepare('SELECT COUNT(*) as c FROM journal_entries WHERE user_id = ? AND deleted_at IS NULL').get(userId) as any)?.c || 0;

  return { syncedCount, totalCount: total };
}

export function getUserServerEntries(userId: string): ServerJournalEntry[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM journal_entries
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title || undefined,
    body: r.body,
    mood: r.mood || undefined,
    wordCount: r.word_count || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: null,
    syncedAt: r.synced_at,
  }));
}

export function getAllServerEntries(): Array<
  ServerJournalEntry & { authorName: string; authorEmail: string }
> {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      e.*,
      COALESCE(u.name, 'Người dùng ẩn danh') as authorName,
      COALESCE(u.email, 'unknown') as authorEmail
    FROM journal_entries e
    LEFT JOIN users u ON u.id = e.user_id
    WHERE e.deleted_at IS NULL
    ORDER BY e.created_at DESC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title || undefined,
    body: r.body,
    mood: r.mood || undefined,
    wordCount: r.word_count || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: null,
    syncedAt: r.synced_at,
    authorName: r.authorName,
    authorEmail: r.authorEmail,
  }));
}

export function deleteServerEntry(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare('UPDATE journal_entries SET deleted_at = ? WHERE id = ?').run(Date.now(), id);
  syncToJsonBackup(db);
  return res.changes > 0;
}

export function purgeSoftDeletedEntries(windowMs = 10000): number {
  const db = getDatabase();
  const cutoff = Date.now() - windowMs;
  const res = db.prepare('DELETE FROM journal_entries WHERE deleted_at IS NOT NULL AND deleted_at <= ?').run(cutoff);
  syncToJsonBackup(db);
  return res.changes;
}

/* ========================================================================= */
/*                          3. FEEDBACK MANAGEMENT                           */
/* ========================================================================= */

export function addServerFeedback(input: {
  userId?: string | null;
  userName: string;
  userEmail?: string;
  rating: number;
  category?: 'peace' | 'music' | 'visuals' | 'journal' | 'general';
  comment: string;
  device?: string;
  clientInfo?: ClientInfo;
}): ServerFeedback {
  const db = getDatabase();
  const id = `fb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = Date.now();
  const ci = input.clientInfo;

  db.prepare(`
    INSERT INTO feedbacks (
      id, user_id, user_name, user_email, rating, category, comment, device, browser, os, ip, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.userId || null,
    input.userName.trim() || 'Người bạn Haven Art',
    input.userEmail ? input.userEmail.trim().toLowerCase() : null,
    Math.min(5, Math.max(1, Math.round(input.rating))),
    input.category || 'peace',
    input.comment.trim(),
    input.device || ci?.device || 'web',
    ci?.browser || null,
    ci?.os || null,
    ci?.ip || null,
    now
  );

  syncToJsonBackup(db);

  return {
    id,
    userId: input.userId || null,
    userName: input.userName.trim() || 'Người bạn Haven Art',
    userEmail: input.userEmail ? input.userEmail.trim().toLowerCase() : undefined,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    category: input.category || 'peace',
    comment: input.comment.trim(),
    device: input.device || ci?.device || 'web',
    browser: ci?.browser || undefined,
    os: ci?.os || undefined,
    ip: ci?.ip || undefined,
    createdAt: now,
  };
}

export function getAllServerFeedbacks(): ServerFeedback[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id || null,
    userName: r.user_name,
    userEmail: r.user_email || undefined,
    rating: r.rating,
    category: r.category,
    comment: r.comment,
    device: r.device || undefined,
    browser: r.browser || undefined,
    os: r.os || undefined,
    ip: r.ip || undefined,
    createdAt: r.created_at,
  }));
}

export function deleteServerFeedback(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM feedbacks WHERE id = ?').run(id);
  syncToJsonBackup(db);
  return res.changes > 0;
}

export function getFeedbackStats(): {
  averageRating: number;
  totalCount: number;
  distribution: Record<number, number>;
} {
  const db = getDatabase();
  const totalRow = db.prepare('SELECT COUNT(*) as c, COALESCE(AVG(rating), 5) as avg FROM feedbacks').get() as any;
  const distRows = db.prepare('SELECT rating, COUNT(*) as c FROM feedbacks GROUP BY rating').all() as any[];

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distRows) {
    distribution[row.rating] = row.c;
  }

  const totalCount = totalRow?.c || 0;
  const averageRating = totalCount > 0 ? Math.round(totalRow.avg * 10) / 10 : 5.0;

  return {
    averageRating,
    totalCount,
    distribution,
  };
}

/* ========================================================================= */
/*                   4. SESSION & TRAFFIC TELEMETRY                          */
/* ========================================================================= */

export function recordServerSession(input: {
  sessionId: string;
  userId?: string | null;
  durationSeconds?: number;
  pageViews?: number;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  browserVersion?: string;
  os?: string;
  language?: string;
  ip?: string;
}): { id: string; durationSeconds: number } {
  const db = getDatabase();
  const id = `ses_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = Date.now();

  db.prepare(`
    INSERT INTO sessions (
      id, session_id, user_id, duration_seconds, page_views, device, browser, browser_version, os, language, ip, start_time, last_ping_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      duration_seconds = MAX(duration_seconds, excluded.duration_seconds),
      page_views = MAX(page_views, excluded.page_views),
      last_ping_at = excluded.last_ping_at
  `).run(
    id,
    input.sessionId,
    input.userId || null,
    input.durationSeconds || 0,
    input.pageViews || 1,
    input.device || 'desktop',
    input.browser || null,
    input.browserVersion || null,
    input.os || null,
    input.language || null,
    input.ip || null,
    now,
    now
  );

  syncToJsonBackup(db);

  return { id, durationSeconds: input.durationSeconds || 0 };
}

export function getServerAnalyticsSummary(): {
  visits: { total: number; today: number; thisWeek: number };
  duration: { averageSeconds: number; totalSeconds: number };
  devices: { desktop: number; mobile: number; tablet: number };
  browsers: Record<string, number>;
  operatingSystems: Record<string, number>;
  users: { total: number; activeToday: number };
  journal: { totalEntries: number; totalWords: number; moodBreakdown: Record<string, number> };
} {
  const db = getDatabase();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Session stats
  const totalSessions = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as any)?.c || 0;
  const todaySessions = (db.prepare('SELECT COUNT(*) as c FROM sessions WHERE last_ping_at >= ?').get(oneDayAgo) as any)?.c || 0;
  const weekSessions = (db.prepare('SELECT COUNT(*) as c FROM sessions WHERE last_ping_at >= ?').get(oneWeekAgo) as any)?.c || 0;
  const durationRow = db.prepare('SELECT COALESCE(SUM(duration_seconds), 0) as total, COALESCE(AVG(duration_seconds), 0) as avg FROM sessions').get() as any;

  // Device stats
  const deviceRows = db.prepare('SELECT device, COUNT(*) as c FROM sessions GROUP BY device').all() as any[];
  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  for (const r of deviceRows) {
    if (r.device === 'mobile') devices.mobile = r.c;
    else if (r.device === 'tablet') devices.tablet = r.c;
    else devices.desktop = r.c;
  }

  // Browser stats
  const browserRows = db.prepare("SELECT COALESCE(browser, 'Khác') as b, COUNT(*) as c FROM sessions GROUP BY browser").all() as any[];
  const browsers: Record<string, number> = {};
  for (const r of browserRows) {
    browsers[r.b] = r.c;
  }

  // OS stats
  const osRows = db.prepare("SELECT COALESCE(os, 'Khác') as o, COUNT(*) as c FROM sessions GROUP BY os").all() as any[];
  const operatingSystems: Record<string, number> = {};
  for (const r of osRows) {
    operatingSystems[r.o] = r.c;
  }

  // User stats
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
  const activeTodayUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE last_active_at >= ?').get(oneDayAgo) as any)?.c || 0;

  // Journal stats
  const journalRow = db.prepare('SELECT COUNT(*) as total, COALESCE(SUM(word_count), 0) as words FROM journal_entries WHERE deleted_at IS NULL').get() as any;
  const moodRows = db.prepare('SELECT mood, COUNT(*) as c FROM journal_entries WHERE deleted_at IS NULL AND mood IS NOT NULL GROUP BY mood').all() as any[];
  const moodBreakdown: Record<string, number> = {};
  for (const r of moodRows) {
    moodBreakdown[r.mood] = r.c;
  }

  return {
    visits: {
      total: totalSessions,
      today: todaySessions,
      thisWeek: weekSessions,
    },
    duration: {
      averageSeconds: Math.round(durationRow?.avg || 0),
      totalSeconds: Math.round(durationRow?.total || 0),
    },
    devices,
    browsers,
    operatingSystems,
    users: {
      total: totalUsers,
      activeToday: activeTodayUsers,
    },
    journal: {
      totalEntries: journalRow?.total || 0,
      totalWords: journalRow?.words || 0,
      moodBreakdown,
    },
  };
}

/* ========================================================================= */
/*                      5. DATABASE METRICS & BACKUP                         */
/* ========================================================================= */

export function getServerDbStats(): {
  filePath: string;
  sqlitePath: string;
  fileSizeBytes: number;
  totalUsers: number;
  totalEntries: number;
  totalFeedbacks: number;
  totalSessions: number;
  version: number;
  lastModifiedMs: number;
} {
  const filePath = getServerDbPath();
  const sqlitePath = getSqliteDbPath();
  const db = getDatabase();

  let fileSizeBytes = 0;
  let lastModifiedMs = Date.now();

  try {
    const stat = fs.statSync(sqlitePath);
    fileSizeBytes = stat.size;
    lastModifiedMs = stat.mtimeMs;
  } catch {
    try {
      const stat = fs.statSync(filePath);
      fileSizeBytes = stat.size;
      lastModifiedMs = stat.mtimeMs;
    } catch {
      // Ignore
    }
  }

  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
  const totalEntries = (db.prepare('SELECT COUNT(*) as c FROM journal_entries').get() as any)?.c || 0;
  const totalFeedbacks = (db.prepare('SELECT COUNT(*) as c FROM feedbacks').get() as any)?.c || 0;
  const totalSessions = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as any)?.c || 0;

  return {
    filePath,
    sqlitePath,
    fileSizeBytes,
    totalUsers,
    totalEntries,
    totalFeedbacks,
    totalSessions,
    version: 2,
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

  let usersImported = 0;
  for (const nu of newUsers) {
    if (!nu.email) continue;
    const exists = current.users.findIndex((u) => u.email.toLowerCase() === nu.email.toLowerCase());
    if (exists >= 0) {
      current.users[exists] = { ...current.users[exists], ...nu };
    } else {
      current.users.push(nu);
      usersImported++;
    }
  }

  let entriesImported = 0;
  for (const ne of newEntries) {
    if (!ne.id) continue;
    const exists = current.entries.findIndex((e) => e.id === ne.id);
    if (exists >= 0) {
      current.entries[exists] = { ...current.entries[exists], ...ne };
    } else {
      current.entries.push(ne);
      entriesImported++;
    }
  }

  let feedbacksImported = 0;
  for (const nf of newFeedbacks) {
    if (!nf.id) continue;
    const exists = current.feedbacks.findIndex((f) => f.id === nf.id);
    if (exists >= 0) {
      current.feedbacks[exists] = { ...current.feedbacks[exists], ...nf };
    } else {
      current.feedbacks.push(nf);
      feedbacksImported++;
    }
  }

  writeServerDatabase(current);

  return {
    success: true,
    usersImported,
    entriesImported,
    feedbacksImported,
  };
}
