import type { JournalRepository } from '../db/repository';
import { generateUlid, type JournalEntry } from '../db/schema';
import {
  validateImportPayload,
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  BACKUP_VERSION,
  type BackupPayload,
  type ValidationResult,
} from './schema';

export interface ImportOptions {
  /**
   * Deduplication strategy when encountering an entry ID already present in the database:
   * - 'skip': Keep existing record and skip incoming item (default)
   * - 'replace': Overwrite existing record with incoming item
   * - 'generate-new-ids': Assign a new monotonic ULID and insert incoming item as new record
   */
  deduplication?: 'skip' | 'replace' | 'generate-new-ids';
}

export interface ImportResult {
  /** Number of newly inserted entries */
  importedCount: number;
  /** Number of skipped duplicate entries */
  skippedCount: number;
  /** Number of overwritten duplicate entries */
  replacedCount: number;
  /** Array of any errors encountered */
  errors: string[];
}

export interface ImportPreview {
  /** Total entries present in the backup file */
  totalInFile: number;
  /** Count of entries that do not currently exist in the database */
  newEntries: number;
  /** Count of entries whose IDs collide with existing records */
  duplicateEntries: number;
  /** List of colliding entry IDs */
  existingIds: string[];
}

/**
 * BackupManager handles local-first backup export, schema validation,
 * preview analysis, and atomic transaction-safe import with ULID deduplication.
 */
export class BackupManager {
  private repo: JournalRepository;

  constructor(repo: JournalRepository) {
    this.repo = repo;
  }

  /**
   * Exports all journal entries (including soft-deleted) and current drafts
   * as a typed BackupPayload conforming to Schema Version 1.
   */
  public async exportData(): Promise<BackupPayload> {
    await this.repo.init();
    const entries = await this.repo.listEntries(true);
    const draft = await this.repo.getDraft();

    const payload: BackupPayload = {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      entries,
      drafts: draft ? [draft] : [],
      metadata: {
        totalEntries: entries.length,
        activeEntries: entries.filter((e) => e.deletedAt === null).length,
        deletedEntries: entries.filter((e) => e.deletedAt !== null).length,
        encryptedEntries: 0,
      },
    };

    return payload;
  }

  /**
   * Exports all journal data formatted as a pretty-printed JSON string.
   */
  public async exportBackup(): Promise<string> {
    const data = await this.exportData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Validates a backup JSON string or payload object against the strict schema.
   */
  public validateBackup(jsonString: string): ValidationResult {
    return validateImportPayload(jsonString);
  }

  /**
   * Analyzes an import backup against the current local database without making mutations.
   * Throws an error immediately if the JSON format or schema is invalid.
   */
  public async previewImport(jsonString: string): Promise<ImportPreview> {
    const validation = validateImportPayload(jsonString);
    if (!validation.valid || !validation.data) {
      throw new Error(`Backup validation failed: ${validation.errors.join('; ')}`);
    }

    const payload = validation.data;
    await this.repo.init();

    let newEntries = 0;
    let duplicateEntries = 0;
    const existingIds: string[] = [];

    for (const entry of payload.entries) {
      const existing = await this.repo.getEntry(entry.id);
      if (existing) {
        duplicateEntries++;
        existingIds.push(entry.id);
      } else {
        newEntries++;
      }
    }

    return {
      totalInFile: payload.entries.length,
      newEntries,
      duplicateEntries,
      existingIds,
    };
  }

  /**
   * Atomically imports journal entries from a validated JSON backup string.
   * Performs schema validation BEFORE opening an IndexedDB transaction.
   * In the event of any validation error or unexpected failure, rolls back
   * without mutating existing database records.
   */
  public async importBackup(
    jsonString: string,
    options?: ImportOptions
  ): Promise<ImportResult> {
    // 1. Strict schema validation before any IndexedDB interaction
    const validation = validateImportPayload(jsonString);
    if (!validation.valid || !validation.data) {
      throw new Error(`Backup validation failed: ${validation.errors.join('; ')}`);
    }

    const payload = validation.data;
    const deduplication = options?.deduplication ?? 'skip';

    // 2. Open readwrite transaction spanning entries and drafts stores
    const db = await this.repo.init();
    const tx = db.transaction(['entries', 'drafts'], 'readwrite');
    const entryStore = tx.objectStore('entries');
    const draftStore = tx.objectStore('drafts');

    let importedCount = 0;
    let skippedCount = 0;
    let replacedCount = 0;
    const errors: string[] = [];

    try {
      for (const entry of payload.entries) {
        const sanitized: JournalEntry = {
          id: entry.id,
          title: entry.title,
          body: entry.body,
          mood: entry.mood,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          deletedAt: entry.deletedAt ?? null,
        };

        const existing = await entryStore.get(sanitized.id);

        if (existing) {
          if (deduplication === 'skip') {
            skippedCount++;
            continue;
          } else if (deduplication === 'replace') {
            await entryStore.put(sanitized);
            replacedCount++;
            continue;
          } else if (deduplication === 'generate-new-ids') {
            const newId = generateUlid();
            const cloned: JournalEntry = {
              ...sanitized,
              id: newId,
            };
            await entryStore.put(cloned);
            importedCount++;
            continue;
          }
        } else {
          await entryStore.put(sanitized);
          importedCount++;
        }
      }

      // Restore drafts if present
      if (payload.drafts && Array.isArray(payload.drafts)) {
        for (const draft of payload.drafts) {
          await draftStore.put(draft);
        }
      }

      await tx.done;
    } catch (err: any) {
      try {
        tx.abort();
      } catch {
        // Transaction may already be aborted
      }
      throw new Error(`Transaction failed during backup import: ${err?.message || err}`);
    }

    return {
      importedCount,
      skippedCount,
      replacedCount,
      errors,
    };
  }

  /**
   * Alias for importBackup to conform to standard memory interface contracts.
   */
  public async importData(
    jsonString: string,
    options?: ImportOptions
  ): Promise<ImportResult> {
    return this.importBackup(jsonString, options);
  }
}
