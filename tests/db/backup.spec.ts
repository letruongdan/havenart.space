import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { JournalRepository } from '../../src/lib/db/repository';
import { BackupManager } from '../../src/lib/export/backup';
import {
  validateImportPayload,
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  type BackupPayload,
} from '../../src/lib/export/schema';

describe('BackupManager', () => {
  let repo: JournalRepository;
  let backup: BackupManager;
  const TEST_DB = 'backup-test-db';

  beforeEach(async () => {
    repo = new JournalRepository(TEST_DB);
    await repo.init();
    backup = new BackupManager(repo);
  });

  afterEach(async () => {
    await repo.close();
    indexedDB.deleteDatabase(TEST_DB);
  });

  describe('Core Acceptance & Deduplication by ULID', () => {
    it('exports and re-imports valid json without data corruption or duplicates', async () => {
      const entry = await repo.createEntry({ title: 'Ghi chú', body: 'Lưu trữ an toàn' });
      const jsonString = await backup.exportBackup();

      // Import lại cùng dữ liệu
      const result = await backup.importBackup(jsonString);
      expect(result.importedCount).toBe(0); // Bị dedupe theo ID
      expect(result.skippedCount).toBe(1);

      const all = await repo.listActiveEntries();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(entry.id);
      expect(all[0].body).toBe('Lưu trữ an toàn');
    });

    it('skips existing entries by default and preserves their original content', async () => {
      const entry = await repo.createEntry({ title: 'Original Title', body: 'Original Content' });
      
      // Modify payload to have same ID but different content
      const exported = await backup.exportData();
      exported.entries[0].title = 'Tampered Title';
      exported.entries[0].body = 'Tampered Content';

      const jsonString = JSON.stringify(exported);
      const result = await backup.importBackup(jsonString);

      expect(result.skippedCount).toBe(1);
      expect(result.importedCount).toBe(0);

      // Verify original content was not overwritten
      const current = await repo.getEntry(entry.id);
      expect(current?.title).toBe('Original Title');
      expect(current?.body).toBe('Original Content');
    });

    it('handles mixed payloads with both new and duplicate entries correctly', async () => {
      const entry1 = await repo.createEntry({ title: 'Note 1', body: 'Body 1' });
      const entry2 = await repo.createEntry({ title: 'Note 2', body: 'Body 2' });

      // Create backup containing entry1 and entry2
      const exported = await backup.exportData();

      // Add 2 brand new entries to the exported payload
      const now = Date.now();
      exported.entries.push({
        id: '01J8NEWENTRY00000000000001',
        title: 'New Note 3',
        body: 'New Body 3',
        mood: 'calm',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      exported.entries.push({
        id: '01J8NEWENTRY00000000000002',
        title: 'New Note 4',
        body: 'New Body 4',
        mood: 'hopeful',
        createdAt: now + 1,
        updatedAt: now + 1,
        deletedAt: null,
      });

      const jsonString = JSON.stringify(exported);
      const result = await backup.importBackup(jsonString);

      expect(result.importedCount).toBe(2);
      expect(result.skippedCount).toBe(2);

      const all = await repo.listActiveEntries();
      expect(all.length).toBe(4);
    });

    it('supports replace deduplication option', async () => {
      const entry = await repo.createEntry({ title: 'Old Title', body: 'Old Body' });
      const exported = await backup.exportData();
      exported.entries[0].title = 'Replaced Title';
      exported.entries[0].body = 'Replaced Body';

      const result = await backup.importBackup(JSON.stringify(exported), {
        deduplication: 'replace',
      });

      expect(result.replacedCount).toBe(1);
      expect(result.skippedCount).toBe(0);

      const updated = await repo.getEntry(entry.id);
      expect(updated?.title).toBe('Replaced Title');
      expect(updated?.body).toBe('Replaced Body');
    });

    it('supports generate-new-ids deduplication option', async () => {
      const entry = await repo.createEntry({ title: 'Original Note', body: 'Original Body' });
      const exported = await backup.exportData();

      const result = await backup.importBackup(JSON.stringify(exported), {
        deduplication: 'generate-new-ids',
      });

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(0);

      const all = await repo.listActiveEntries();
      expect(all.length).toBe(2);
      const cloned = all.find((e) => e.id !== entry.id);
      expect(cloned).toBeDefined();
      expect(cloned?.title).toBe('Original Note');
      expect(cloned?.body).toBe('Original Body');
    });
  });

  describe('Empty Export & Import Handling', () => {
    it('exports a compliant empty backup payload when database has no entries', async () => {
      const jsonString = await backup.exportBackup();
      const parsed = JSON.parse(jsonString);

      expect(parsed.app).toBe(BACKUP_APP_ID);
      expect(parsed.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
      expect(parsed.version).toBe(1);
      expect(parsed.entries).toEqual([]);
      expect(typeof parsed.exportedAt).toBe('string');
      expect(parsed.metadata?.totalEntries).toBe(0);

      // Validate through Ajv validator
      const validation = validateImportPayload(jsonString);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('imports empty backup payload without error', async () => {
      const jsonString = await backup.exportBackup();
      const result = await backup.importBackup(jsonString);

      expect(result.importedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.errors).toEqual([]);

      const all = await repo.listActiveEntries();
      expect(all.length).toBe(0);
    });
  });

  describe('Roundtrip Integrity (DB A -> DB B)', () => {
    const TARGET_DB = 'backup-roundtrip-target-db';
    let targetRepo: JournalRepository;
    let targetBackup: BackupManager;

    beforeEach(async () => {
      targetRepo = new JournalRepository(TARGET_DB);
      await targetRepo.init();
      targetBackup = new BackupManager(targetRepo);
    });

    afterEach(async () => {
      await targetRepo.close();
      indexedDB.deleteDatabase(TARGET_DB);
    });

    it('exports from DB A and imports into DB B producing identical entries and drafts', async () => {
      // Setup DB A with diverse records
      const e1 = await repo.createEntry({
        title: 'Bình minh tĩnh lặng',
        body: 'Mặt trời lên từ phía chân trời xa, không gian an yên.',
        mood: 'calm',
      });
      const e2 = await repo.createEntry({
        title: 'Lời cảm ơn cuối ngày',
        body: 'Biết ơn những khoảnh khắc nhẹ nhàng trong ngày.',
        mood: 'grateful',
      });
      const e3 = await repo.createEntry({
        title: 'Bản ghi tạm bị xóa',
        body: 'Ghi chú này sẽ được chuyển vào thùng rác mềm.',
      });
      await repo.softDeleteEntry(e3.id);

      // Setup draft in DB A
      await repo.saveDraft({
        title: 'Ý tưởng chưa hoàn thành',
        body: 'Một dòng suy tư đang dở dang...',
        mood: 'reflective',
      });

      // Export from DB A
      const jsonBackup = await backup.exportBackup();

      // Import into DB B
      const result = await targetBackup.importBackup(jsonBackup);
      expect(result.importedCount).toBe(3);
      expect(result.skippedCount).toBe(0);

      // Verify active entries in DB B
      const activeEntries = await targetRepo.listActiveEntries();
      expect(activeEntries.length).toBe(2);

      const targetE1 = await targetRepo.getEntry(e1.id);
      expect(targetE1).toEqual(e1);

      const targetE2 = await targetRepo.getEntry(e2.id);
      expect(targetE2).toEqual(e2);

      // Verify soft-deleted entry in DB B
      const targetE3 = await targetRepo.getEntry(e3.id);
      expect(targetE3).toBeDefined();
      expect(targetE3?.deletedAt).not.toBeNull();
      expect(targetE3?.id).toBe(e3.id);
      expect(targetE3?.title).toBe(e3.title);

      // Verify draft in DB B
      const targetDraft = await targetRepo.getDraft();
      expect(targetDraft).toBeDefined();
      expect(targetDraft?.title).toBe('Ý tưởng chưa hoàn thành');
      expect(targetDraft?.body).toBe('Một dòng suy tư đang dở dang...');
      expect(targetDraft?.mood).toBe('reflective');
    });
  });

  describe('Preview Import API', () => {
    it('previews import summary accurately without altering database records', async () => {
      const e1 = await repo.createEntry({ title: 'E1', body: 'Body 1' });
      const e2 = await repo.createEntry({ title: 'E2', body: 'Body 2' });

      const exported = await backup.exportData();
      exported.entries.push({
        id: '01J8BRANDNEW00000000000001',
        title: 'E3',
        body: 'Body 3',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      });

      const preview = await backup.previewImport(JSON.stringify(exported));
      expect(preview.totalInFile).toBe(3);
      expect(preview.duplicateEntries).toBe(2);
      expect(preview.newEntries).toBe(1);

      // Database records must remain exactly 2
      const all = await repo.listActiveEntries();
      expect(all.length).toBe(2);
    });

    it('throws error when previewing invalid json or corrupted payload', async () => {
      await expect(backup.previewImport('invalid-json{{{')).rejects.toThrow();
      await expect(
        backup.previewImport(JSON.stringify({ app: 'wrong-app', entries: [] }))
      ).rejects.toThrow();
    });
  });

  describe('Validation, Schema Rejection & Atomic Transaction Safety', () => {
    it('rejects malformed json string without corrupting database', async () => {
      await repo.createEntry({ title: 'Preserved Entry', body: 'Data is safe' });

      await expect(backup.importBackup('not-valid-json{{')).rejects.toThrow(
        /JSON parse error|invalid/i
      );

      const entries = await repo.listActiveEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].title).toBe('Preserved Entry');
    });

    it('rejects payloads with missing required schema fields', async () => {
      const invalidPayloads = [
        {}, // empty object
        { version: 1, app: 'haven-art' }, // missing exportedAt and entries
        { version: 1, exportedAt: new Date().toISOString(), entries: [] }, // missing app
        { app: 'haven-art', version: 1, schemaVersion: 1, exportedAt: Date.now() }, // missing entries
      ];

      for (const bad of invalidPayloads) {
        const validation = validateImportPayload(bad);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);

        await expect(backup.importBackup(JSON.stringify(bad))).rejects.toThrow();
      }
    });

    it('rejects foreign or unapproved app identifiers', async () => {
      const foreign = {
        app: 'malicious-or-unknown-app',
        version: 1,
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        entries: [],
      };

      const validation = validateImportPayload(foreign);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('app') || e.includes('const') || e.includes('haven-art'))).toBe(true);

      await expect(backup.importBackup(JSON.stringify(foreign))).rejects.toThrow();
    });

    it('rejects unsupported schema versions', async () => {
      const futureVersion = {
        app: BACKUP_APP_ID,
        version: 1,
        schemaVersion: 99,
        exportedAt: new Date().toISOString(),
        entries: [],
      };

      const validation = validateImportPayload(futureVersion);
      expect(validation.valid).toBe(false);

      await expect(backup.importBackup(JSON.stringify(futureVersion))).rejects.toThrow();
    });

    it('rejects entries with corrupted types or missing required entry fields', async () => {
      const badEntryPayload = {
        app: BACKUP_APP_ID,
        version: 1,
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        entries: [
          {
            // missing id and body
            title: 'Incomplete entry',
            createdAt: 'not-a-number',
          },
        ],
      };

      const validation = validateImportPayload(badEntryPayload);
      expect(validation.valid).toBe(false);

      await expect(backup.importBackup(JSON.stringify(badEntryPayload))).rejects.toThrow();
    });

    it('aborts atomically before writing when import validation fails', async () => {
      await repo.createEntry({ title: 'Baseline 1', body: 'Body 1' });
      await repo.createEntry({ title: 'Baseline 2', body: 'Body 2' });

      const invalidPayload = JSON.stringify({
        app: BACKUP_APP_ID,
        version: 1,
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        entries: 'this-should-be-an-array',
      });

      await expect(backup.importBackup(invalidPayload)).rejects.toThrow();

      // Database records must remain identical to baseline
      const entries = await repo.listActiveEntries();
      expect(entries.length).toBe(2);
      expect(entries.map((e) => e.title).sort()).toEqual(['Baseline 1', 'Baseline 2']);
    });
  });
});
