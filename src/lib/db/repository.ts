import type { IDBPDatabase } from 'idb';
import {
  openHavenDB,
  generateUlid,
  DB_NAME,
  DB_VERSION,
  DEFAULT_DRAFT_ID,
  type JournalEntry,
  type CreateJournalEntryInput,
  type UpdateJournalEntryInput,
  type DraftEntry,
  type HavenDBSchema,
} from './schema';
import { DraftRepository, type SaveDraftInput } from './drafts';

/**
 * JournalRepository handles local-first storage and CRUD for journal entries and drafts.
 */
export class JournalRepository {
  public readonly dbName: string;
  public readonly version: number;
  private db: IDBPDatabase<HavenDBSchema> | null = null;
  private draftsRepo: DraftRepository | null = null;

  constructor(dbName: string = DB_NAME, version: number = DB_VERSION) {
    this.dbName = dbName;
    this.version = version;
  }

  /**
   * Initializes and opens the IndexedDB database.
   */
  public async init(): Promise<IDBPDatabase<HavenDBSchema>> {
    if (!this.db) {
      this.db = await openHavenDB(this.dbName, this.version);
      this.draftsRepo = new DraftRepository(this.dbName, this.version, this.db);
    }
    return this.db;
  }

  /**
   * Returns the underlying IDBPDatabase instance.
   * Throws if the repository has not been initialized.
   */
  public getRawDb(): IDBPDatabase<HavenDBSchema> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() before accessing raw database.');
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
   * Creates a new journal entry with ULID and timestamps.
   */
  public async createEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    const db = await this.getDb();
    const id = input.id || generateUlid();
    const now = Date.now();
    const createdAt = input.createdAt ?? now;
    const updatedAt = input.updatedAt ?? createdAt;

    const entry: JournalEntry = {
      id,
      title: input.title,
      body: input.body,
      mood: input.mood,
      createdAt,
      updatedAt,
      deletedAt: null,
    };

    await db.put('entries', entry);
    return entry;
  }

  /**
   * Retrieves an entry by its ID.
   */
  public async getEntry(id: string): Promise<JournalEntry | undefined> {
    const db = await this.getDb();
    return await db.get('entries', id);
  }

  /**
   * Updates an existing journal entry.
   * Throws if entry is not found.
   */
  public async updateEntry(
    id: string,
    updates: UpdateJournalEntryInput
  ): Promise<JournalEntry> {
    const db = await this.getDb();
    const tx = db.transaction('entries', 'readwrite');
    const existing = await tx.store.get(id);

    if (!existing) {
      await tx.done;
      throw new Error(`Journal entry with id "${id}" not found`);
    }

    const updated: JournalEntry = {
      ...existing,
      updatedAt: Date.now(),
    };

    if (updates.title !== undefined) updated.title = updates.title;
    if (updates.body !== undefined) updated.body = updates.body;
    if (updates.mood !== undefined) updated.mood = updates.mood;
    if (updates.deletedAt !== undefined) updated.deletedAt = updates.deletedAt;

    await tx.store.put(updated);
    await tx.done;
    return updated;
  }

  /**
   * Lists all active (non-soft-deleted) entries ordered by createdAt descending.
   */
  public async listActiveEntries(): Promise<JournalEntry[]> {
    const db = await this.getDb();
    const all = await db.getAll('entries');
    return all
      .filter((entry) => entry.deletedAt === null)
      .sort((a, b) =>
        b.createdAt !== a.createdAt ? b.createdAt - a.createdAt : b.id.localeCompare(a.id)
      );
  }

  /**
   * Lists entries. When includeDeleted is true, includes soft-deleted entries.
   */
  public async listEntries(includeDeleted: boolean = false): Promise<JournalEntry[]> {
    if (!includeDeleted) {
      return this.listActiveEntries();
    }
    const db = await this.getDb();
    const all = await db.getAll('entries');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Soft-deletes an entry by recording the current timestamp in deletedAt.
   */
  public async softDeleteEntry(id: string): Promise<JournalEntry> {
    return await this.updateEntry(id, { deletedAt: Date.now() });
  }

  /**
   * Restores a soft-deleted entry by resetting deletedAt to null.
   */
  public async undoDelete(id: string): Promise<JournalEntry> {
    return await this.updateEntry(id, { deletedAt: null });
  }

  /**
   * Permanently deletes an entry from the database.
   */
  public async permanentlyDeleteEntry(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete('entries', id);
  }

  /**
   * Purges soft-deleted entries that are older than the specified undo window.
   * @param windowMs Milliseconds threshold (default: 10,000ms = 10s)
   * @returns Number of permanently purged entries
   */
  public async purgeExpiredDeletes(windowMs: number = 10000): Promise<number> {
    const db = await this.getDb();
    const now = Date.now();
    const tx = db.transaction('entries', 'readwrite');
    const all = await tx.store.getAll();
    let purgedCount = 0;

    for (const entry of all) {
      if (entry.deletedAt !== null && now - entry.deletedAt >= windowMs) {
        await tx.store.delete(entry.id);
        purgedCount++;
      }
    }

    await tx.done;
    return purgedCount;
  }

  /**
   * Saves or updates in-flight draft.
   */
  public async saveDraft(draft: SaveDraftInput): Promise<DraftEntry> {
    const db = await this.getDb();
    if (!this.draftsRepo) {
      this.draftsRepo = new DraftRepository(this.dbName, this.version, db);
    }
    return await this.draftsRepo.saveDraft(draft);
  }

  /**
   * Retrieves current draft.
   */
  public async getDraft(id: string = DEFAULT_DRAFT_ID): Promise<DraftEntry | undefined> {
    const db = await this.getDb();
    if (!this.draftsRepo) {
      this.draftsRepo = new DraftRepository(this.dbName, this.version, db);
    }
    return await this.draftsRepo.getDraft(id);
  }

  /**
   * Clears current draft.
   */
  public async clearDraft(id: string = DEFAULT_DRAFT_ID): Promise<void> {
    const db = await this.getDb();
    if (!this.draftsRepo) {
      this.draftsRepo = new DraftRepository(this.dbName, this.version, db);
    }
    await this.draftsRepo.clearDraft(id);
  }

  /**
   * Closes database connection.
   */
  public async close(): Promise<void> {
    if (this.draftsRepo) {
      await this.draftsRepo.close();
      this.draftsRepo = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
