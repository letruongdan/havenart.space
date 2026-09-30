import type { IDBPDatabase } from 'idb';
import {
  openHavenDB,
  DB_NAME,
  DB_VERSION,
  DEFAULT_DRAFT_ID,
  type DraftEntry,
  type HavenDBSchema,
} from './schema';

export interface SaveDraftInput {
  id?: string;
  title?: string;
  body?: string;
  mood?: string;
}

export interface DraftOptions {
  id?: string;
  dbName?: string;
}

/**
 * DraftRepository manages local-first autosaved drafts.
 */
export class DraftRepository {
  public readonly dbName: string;
  public readonly version: number;
  private db: IDBPDatabase<HavenDBSchema> | null = null;

  constructor(
    dbName: string = DB_NAME,
    version: number = DB_VERSION,
    dbInstance?: IDBPDatabase<HavenDBSchema>
  ) {
    this.dbName = dbName;
    this.version = version;
    if (dbInstance) {
      this.db = dbInstance;
    }
  }

  /**
   * Initializes database connection.
   */
  public async init(): Promise<IDBPDatabase<HavenDBSchema>> {
    if (!this.db) {
      this.db = await openHavenDB(this.dbName, this.version);
    }
    return this.db;
  }

  private async getDb(): Promise<IDBPDatabase<HavenDBSchema>> {
    if (!this.db) {
      return await this.init();
    }
    return this.db;
  }

  /**
   * Saves or overwrites the draft.
   */
  public async saveDraft(draft: SaveDraftInput): Promise<DraftEntry> {
    const db = await this.getDb();
    const entry: DraftEntry = {
      id: draft.id || DEFAULT_DRAFT_ID,
      title: draft.title ?? '',
      body: draft.body ?? '',
      mood: draft.mood ?? '',
      updatedAt: Date.now(),
    };
    await db.put('drafts', entry);
    return entry;
  }

  /**
   * Retrieves draft by identifier (defaults to 'current').
   */
  public async getDraft(id: string = DEFAULT_DRAFT_ID): Promise<DraftEntry | undefined> {
    const db = await this.getDb();
    return await db.get('drafts', id);
  }

  /**
   * Deletes draft by identifier (defaults to 'current').
   */
  public async clearDraft(id: string = DEFAULT_DRAFT_ID): Promise<void> {
    const db = await this.getDb();
    await db.delete('drafts', id);
  }

  /**
   * Closes database connection.
   */
  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

function parseDraftOptions(
  idOrDbNameOrOptions?: string | DraftOptions,
  explicitDbName?: string
): { id: string; dbName: string } {
  if (typeof idOrDbNameOrOptions === 'object' && idOrDbNameOrOptions !== null) {
    return {
      id: idOrDbNameOrOptions.id ?? DEFAULT_DRAFT_ID,
      dbName: idOrDbNameOrOptions.dbName ?? DB_NAME,
    };
  }

  if (explicitDbName) {
    return {
      id: idOrDbNameOrOptions ?? DEFAULT_DRAFT_ID,
      dbName: explicitDbName,
    };
  }

  if (typeof idOrDbNameOrOptions === 'string') {
    if (idOrDbNameOrOptions === DEFAULT_DRAFT_ID) {
      return { id: DEFAULT_DRAFT_ID, dbName: DB_NAME };
    }
    // String argument is treated as target database name when using singleton draft
    return { id: DEFAULT_DRAFT_ID, dbName: idOrDbNameOrOptions };
  }

  return { id: DEFAULT_DRAFT_ID, dbName: DB_NAME };
}

/**
 * Convenience helper to save draft.
 */
export async function saveDraft(
  draft: SaveDraftInput,
  dbNameOrOptions?: string | DraftOptions
): Promise<DraftEntry> {
  const { dbName } = parseDraftOptions(dbNameOrOptions);
  const repo = new DraftRepository(dbName);
  try {
    return await repo.saveDraft(draft);
  } finally {
    await repo.close();
  }
}

/**
 * Convenience helper to get draft.
 */
export async function getDraft(
  idOrDbNameOrOptions?: string | DraftOptions,
  explicitDbName?: string
): Promise<DraftEntry | undefined> {
  const { id, dbName } = parseDraftOptions(idOrDbNameOrOptions, explicitDbName);
  const repo = new DraftRepository(dbName);
  try {
    return await repo.getDraft(id);
  } finally {
    await repo.close();
  }
}

/**
 * Convenience helper to clear draft.
 */
export async function clearDraft(
  idOrDbNameOrOptions?: string | DraftOptions,
  explicitDbName?: string
): Promise<void> {
  const { id, dbName } = parseDraftOptions(idOrDbNameOrOptions, explicitDbName);
  const repo = new DraftRepository(dbName);
  try {
    await repo.clearDraft(id);
  } finally {
    await repo.close();
  }
}
