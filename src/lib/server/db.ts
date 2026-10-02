import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  token?: string;
  createdAt: number;
}

export interface ServerJournalEntry {
  id: string;
  userId: string;
  title?: string;
  body: string;
  mood?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncedAt: number;
}

export interface ServerDatabaseSchema {
  version: number;
  users: ServerUser[];
  entries: ServerJournalEntry[];
}

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data', 'server-db.json');

/**
 * Ensures the database directory and file exist with initial schema.
 */
export function getServerDbPath(): string {
  return process.env.HAVEN_SERVER_DB_PATH || DEFAULT_DB_PATH;
}

export function readServerDatabase(): ServerDatabaseSchema {
  const filePath = getServerDbPath();
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const initial: ServerDatabaseSchema = {
        version: 1,
        users: [],
        entries: [],
      };
      fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || 1,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch (err) {
    console.error('Lỗi đọc cơ sở dữ liệu server:', err);
    return { version: 1, users: [], entries: [] };
  }
}

export function writeServerDatabase(data: ServerDatabaseSchema): void {
  const filePath = getServerDbPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Hash password with SHA-256 and unique salt.
 */
export function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha256')
    .toString('hex');
}

/**
 * Generate random hex token.
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Find user by email.
 */
export function findUserByEmail(email: string): ServerUser | undefined {
  const db = readServerDatabase();
  const normalized = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === normalized);
}

/**
 * Find user by session token.
 */
export function findUserByToken(token: string): ServerUser | undefined {
  if (!token) return undefined;
  const db = readServerDatabase();
  return db.users.find((u) => u.token === token);
}

/**
 * Create a new user on the server.
 */
export function createServerUser(params: {
  email: string;
  name: string;
  password: string;
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
    passwordHash,
    salt,
    token,
    createdAt: Date.now(),
  };

  db.users.push(newUser);
  writeServerDatabase(db);

  return { user: newUser, token };
}

/**
 * Authenticate user with email and password.
 */
export function authenticateUser(
  email: string,
  password: string
): { user: ServerUser; token: string } | null {
  const db = readServerDatabase();
  const normalized = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === normalized);

  if (!user) return null;

  const expectedHash = hashPassword(password, user.salt);
  if (crypto.timingSafeEqual(Buffer.from(user.passwordHash), Buffer.from(expectedHash))) {
    const newToken = generateToken();
    user.token = newToken;
    writeServerDatabase(db);
    return { user, token: newToken };
  }

  return null;
}

/**
 * Upsert journal entries for a user on server.
 */
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

    const record: ServerJournalEntry = {
      id: item.id,
      userId,
      title: item.title || '',
      body: item.body,
      mood: item.mood || 'calm',
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
      deletedAt: item.deletedAt ?? null,
      syncedAt: now,
    };

    if (existingIndex >= 0) {
      // Upsert: only update if incoming is newer or equal
      if (record.updatedAt >= db.entries[existingIndex].updatedAt) {
        db.entries[existingIndex] = record;
        syncedCount++;
      }
    } else {
      db.entries.push(record);
      syncedCount++;
    }
  }

  writeServerDatabase(db);

  const totalCount = db.entries.filter(
    (e) => e.userId === userId && e.deletedAt === null
  ).length;

  return { syncedCount, totalCount };
}

/**
 * Retrieve all active entries for a user.
 */
export function getUserServerEntries(userId: string): ServerJournalEntry[] {
  const db = readServerDatabase();
  return db.entries
    .filter((e) => e.userId === userId && e.deletedAt === null)
    .sort((a, b) => b.createdAt - a.createdAt);
}
