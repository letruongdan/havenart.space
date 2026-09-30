import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Journal Entry Model
 * Represents a saved journal note in local-first storage.
 */
export interface JournalEntry {
  /** ULID or timestamp-based monotonic unique ID */
  id: string;
  /** Optional title of the entry */
  title?: string;
  /** Primary text content */
  body: string;
  /** Optional mood tag or reflection state */
  mood?: string;
  /** Creation timestamp in milliseconds */
  createdAt: number;
  /** Last updated timestamp in milliseconds */
  updatedAt: number;
  /** Soft-delete timestamp in milliseconds, or null if active */
  deletedAt: number | null;
}

/**
 * Draft Entry Model
 * Represents an in-flight autosaved draft (typically a singleton).
 */
export interface DraftEntry {
  /** Identifier of the draft, defaults to 'current' */
  id: string;
  /** Draft title */
  title: string;
  /** Draft body text */
  body: string;
  /** Draft mood */
  mood: string;
  /** Timestamp when draft was last saved */
  updatedAt: number;
}

/**
 * Input for creating a new JournalEntry.
 */
export interface CreateJournalEntryInput {
  id?: string;
  title?: string;
  body: string;
  mood?: string;
  createdAt?: number;
}

/**
 * Input for updating an existing JournalEntry.
 */
export interface UpdateJournalEntryInput {
  title?: string;
  body?: string;
  mood?: string;
  deletedAt?: number | null;
}

/**
 * Typed IndexedDB Schema for Haven Art
 */
export interface HavenDBSchema extends DBSchema {
  entries: {
    key: string;
    value: JournalEntry;
    indexes: {
      createdAt: number;
      updatedAt: number;
      deletedAt: number;
    };
  };
  drafts: {
    key: string;
    value: DraftEntry;
  };
}

export const DB_NAME = 'haven_db';
export const DB_VERSION = 1;
export const DEFAULT_DRAFT_ID = 'current';

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;

let lastTime = -1;
const lastRandomBytes = new Uint8Array(16);

/**
 * Generates a 26-character monotonic ULID-compatible unique identifier.
 * First 10 characters encode timestamp (ms), next 16 characters provide entropy.
 */
export function generateUlid(now: number = Date.now()): string {
  // 10 characters for timestamp
  let timeStr = '';
  let time = now;
  for (let i = 0; i < 10; i++) {
    const mod = time % ENCODING_LEN;
    timeStr = ENCODING[mod] + timeStr;
    time = Math.floor(time / ENCODING_LEN);
  }

  const cryptoObj =
    typeof crypto !== 'undefined'
      ? crypto
      : (globalThis as unknown as { crypto?: Crypto })?.crypto;

  if (now === lastTime) {
    // Increment randomness bytes to ensure monotonic sorting within same millisecond
    for (let i = lastRandomBytes.length - 1; i >= 0; i--) {
      if (lastRandomBytes[i] < ENCODING_LEN - 1) {
        lastRandomBytes[i]++;
        break;
      }
      lastRandomBytes[i] = 0;
    }
  } else {
    lastTime = now;
    if (cryptoObj?.getRandomValues) {
      const raw = new Uint8Array(16);
      cryptoObj.getRandomValues(raw);
      for (let i = 0; i < 16; i++) {
        lastRandomBytes[i] = raw[i] % ENCODING_LEN;
      }
    } else {
      for (let i = 0; i < lastRandomBytes.length; i++) {
        lastRandomBytes[i] = Math.floor(Math.random() * ENCODING_LEN);
      }
    }
  }

  let randStr = '';
  for (let i = 0; i < 16; i++) {
    randStr += ENCODING[lastRandomBytes[i]];
  }

  return timeStr + randStr;
}

/**
 * Opens or upgrades the Haven IndexedDB database.
 */
export async function openHavenDB(
  dbName: string = DB_NAME,
  version: number = DB_VERSION
): Promise<IDBPDatabase<HavenDBSchema>> {
  return openDB<HavenDBSchema>(dbName, version, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('entries')) {
        const entryStore = db.createObjectStore('entries', { keyPath: 'id' });
        entryStore.createIndex('createdAt', 'createdAt');
        entryStore.createIndex('updatedAt', 'updatedAt');
        entryStore.createIndex('deletedAt', 'deletedAt');
      }
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'id' });
      }
    },
  });
}
