import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  pushEntriesToServer,
  pullEntriesFromServer,
  syncAllWithServer,
  getLastSyncedAt,
  setLastSyncedAt,
} from '../../src/lib/sync/cloud-sync';
import { setStoredUserSession, logoutUser } from '../../src/lib/auth/user-client';
import { JournalRepository } from '../../src/lib/db/repository';

describe('Cloud Synchronization Subsystem', () => {
  let testRepo: JournalRepository;
  const TEST_DB = 'test-haven-cloud-sync';

  beforeEach(async () => {
    localStorage.clear();
    testRepo = new JournalRepository(TEST_DB);
    await testRepo.init();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    logoutUser();
    localStorage.clear();
    await testRepo.close();
    indexedDB.deleteDatabase(TEST_DB);
    vi.restoreAllMocks();
  });

  it('rejects pushing or pulling when user is not logged in', async () => {
    const pushRes = await pushEntriesToServer([]);
    expect(pushRes.success).toBe(false);
    expect(pushRes.error).toContain('Chưa đăng nhập');

    const pullRes = await pullEntriesFromServer();
    expect(pullRes.success).toBe(false);
    expect(pullRes.error).toContain('Chưa đăng nhập');

    const syncRes = await syncAllWithServer(testRepo);
    expect(syncRes.success).toBe(false);
  });

  it('tracks last synced timestamp in localStorage', () => {
    expect(getLastSyncedAt()).toBeNull();
    const now = 1700000000000;
    setLastSyncedAt(now);
    expect(getLastSyncedAt()).toBe(now);
  });

  it('pushes local entries to server when authenticated', async () => {
    setStoredUserSession({
      user: {
        id: 'usr_mock',
        email: 'user@havenart.space',
        name: 'User',
        createdAt: 1000,
      },
      token: 'valid_bearer_token',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        syncedCount: 2,
        totalCount: 5,
      }),
    } as any);

    const entries = [
      {
        id: 'e1',
        title: 'Entry 1',
        body: 'Body 1',
        mood: 'calm',
        createdAt: 1000,
        updatedAt: 1000,
        deletedAt: null,
      },
    ];

    const res = await pushEntriesToServer(entries);
    expect(res.success).toBe(true);
    expect(res.syncedCount).toBe(2);
    expect(res.serverTotal).toBe(5);
    expect(getLastSyncedAt()).toBeDefined();
  });

  it('pulls server entries and merges them locally', async () => {
    setStoredUserSession({
      user: {
        id: 'usr_mock',
        email: 'user@havenart.space',
        name: 'User',
        createdAt: 1000,
      },
      token: 'valid_bearer_token',
    });

    const serverEntry = {
      id: 'server_entry_99',
      title: 'Viết từ máy khác',
      body: 'Ghi chép trên đám mây',
      mood: 'grateful',
      createdAt: 2000,
      updatedAt: 2000,
      deletedAt: null,
    };

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/sync/push')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, syncedCount: 0, totalCount: 1 }),
        });
      }
      if (url.includes('/api/sync/pull')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, entries: [serverEntry] }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const syncRes = await syncAllWithServer(testRepo);
    expect(syncRes.success).toBe(true);
    expect(syncRes.pulledCount).toBe(1);

    // Verify pulled entry is saved into local IndexedDB
    const localEntries = await testRepo.listActiveEntries();
    expect(localEntries.some((e) => e.id === 'server_entry_99')).toBe(true);
  });
});
