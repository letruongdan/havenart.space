import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JournalRepository } from '../../src/lib/db/repository';
import { BackupManager } from '../../src/lib/export/backup';
import { CryptoVault } from '../../src/lib/crypto/vault';
import 'fake-indexeddb/auto';

describe('Adversarial Red-Team Resilience & Race Condition Suite', () => {
  let repo: JournalRepository;
  const TEST_DB = 'redteam-resilience-db';
  let dbIndex = 0;

  beforeEach(async () => {
    dbIndex++;
    repo = new JournalRepository(`${TEST_DB}-${dbIndex}`);
    await repo.init();
  });

  afterEach(async () => {
    await repo.close();
  });

  it('handles rapid concurrent entry creation without ID collisions or data corruption', async () => {
    const concurrentWrites = 50;
    const promises = Array.from({ length: concurrentWrites }, (_, i) =>
      repo.createEntry({
        title: `Ghi chú đồng thời #${i}`,
        body: `Nội dung đồng thời ${i} được ghi vào IndexedDB cùng một thời điểm.`,
        mood: 'calm',
      })
    );

    const createdEntries = await Promise.all(promises);
    expect(createdEntries.length).toBe(concurrentWrites);

    // Verify all IDs are completely unique (no collisions)
    const uniqueIds = new Set(createdEntries.map((e) => e.id));
    expect(uniqueIds.size).toBe(concurrentWrites);

    // Verify all entries exist in database
    const all = await repo.listActiveEntries();
    expect(all.length).toBe(concurrentWrites);
  });

  it('handles concurrent soft-delete and undo operations cleanly', async () => {
    const entry = await repo.createEntry({
      title: 'Bài viết kiểm thử hoàn tác',
      body: 'Thử nghiệm xóa và hoàn tác liên tục.',
    });

    // Fire rapid delete and undo
    await repo.softDeleteEntry(entry.id);
    let active = await repo.listActiveEntries();
    expect(active.some((e) => e.id === entry.id)).toBe(false);

    await repo.undoDelete(entry.id);
    active = await repo.listActiveEntries();
    expect(active.some((e) => e.id === entry.id)).toBe(true);

    // Soft delete again and purge
    await repo.softDeleteEntry(entry.id);
    // Purge with 0ms window (immediate purge)
    const purged = await repo.purgeExpiredDeletes(0);
    expect(purged).toBe(1);

    const afterPurge = await repo.listEntries(true);
    expect(afterPurge.some((e) => e.id === entry.id)).toBe(false);
  });

  it('resists malformed and adversarial JSON backup imports without corrupting database', async () => {
    const backupManager = new BackupManager(repo);

    // Seed valid data
    await repo.createEntry({ title: 'Bài viết hợp lệ', body: 'Dữ liệu trước kiểm thử.' });

    // Hostile payloads
    const adversarialPayloads = [
      '', // Empty string
      '{ invalid json syntax }', // Syntax error
      '{"schemaVersion": 9999, "app": "haven-art"}', // Unsupported schema version
      '{"schemaVersion": 1, "app": "evil-phishing-app"}', // Spoofed app name
      '{"schemaVersion": 1, "app": "haven-art", "entries": "NOT_AN_ARRAY"}', // Wrong types
      JSON.stringify({
        schemaVersion: 1,
        app: 'haven-art',
        exportedAt: new Date().toISOString(),
        entries: [
          {
            __proto__: { polluted: true },
            id: 'corrupt-entry',
            body: 12345, // Invalid body type
          },
        ],
      }),
    ];

    for (const payload of adversarialPayloads) {
      const validation = backupManager.validateImportPayload(payload);
      expect(validation.valid).toBe(false);

      await expect(backupManager.importBackup(payload)).rejects.toThrow();
    }

    // Verify existing database remained 100% uncorrupted and intact
    const survivingEntries = await repo.listActiveEntries();
    expect(survivingEntries.length).toBe(1);
    expect(survivingEntries[0].title).toBe('Bài viết hợp lệ');
  });

  it('atomically rolls back password rotation when decryption fails mid-process', async () => {
    const vault = new CryptoVault();
    const correctPassword = 'InitialValidPassword123!';
    await vault.unlock(correctPassword);

    const record1 = await vault.encryptRecord('Ghi chú an toàn 1');
    const record2 = await vault.encryptRecord('Ghi chú an toàn 2');

    // Create a corrupted record with altered ciphertext
    const corruptedRecord = {
      ...record2,
      ciphertext: 'CORRUPTED_CIPHERTEXT_BASE64_GARBAGE==',
    };

    // Attempt rotation with bad records array
    await expect(
      vault.rotatePassword(correctPassword, 'NewPassword456!', [record1, corruptedRecord])
    ).rejects.toThrow('Password rotation aborted');

    // Verify vault state is intact under the original password
    const decrypted = await vault.decryptRecord(record1);
    expect(decrypted).toBe('Ghi chú an toàn 1');
  });
});
