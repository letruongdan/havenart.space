import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { JournalRepository } from '../../src/lib/db/repository';
import { DraftRepository, saveDraft, getDraft, clearDraft } from '../../src/lib/db/drafts';
import { DB_NAME, DEFAULT_DRAFT_ID } from '../../src/lib/db/schema';

describe('JournalRepository & Storage Core', () => {
  let repo: JournalRepository;
  const TEST_DB = 'haven-test-db';

  beforeEach(async () => {
    repo = new JournalRepository(TEST_DB);
    await repo.init();
  });

  afterEach(async () => {
    await repo.close();
    indexedDB.deleteDatabase(TEST_DB);
  });

  describe('Initialization & Schemas', () => {
    it('creates database with entries and drafts object stores and indexes', async () => {
      const db = repo.getRawDb();
      expect(db.objectStoreNames.contains('entries')).toBe(true);
      expect(db.objectStoreNames.contains('drafts')).toBe(true);

      const tx = db.transaction('entries', 'readonly');
      const store = tx.objectStore('entries');
      expect(store.indexNames.contains('createdAt')).toBe(true);
      expect(store.indexNames.contains('updatedAt')).toBe(true);
      expect(store.indexNames.contains('deletedAt')).toBe(true);
    });

    it('defaults database name to haven_db when not specified', () => {
      const defaultRepo = new JournalRepository();
      expect(defaultRepo.dbName).toBe(DB_NAME);
    });
  });

  describe('CRUD Operations', () => {
    it('creates, retrieves, and updates an entry locally', async () => {
      const entry = await repo.createEntry({
        title: 'Góc tĩnh lặng',
        body: 'Hôm nay trời dịu mát',
        mood: 'calm',
      });

      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBe(26); // ULID length
      expect(entry.createdAt).toBeTypeOf('number');
      expect(entry.updatedAt).toBe(entry.createdAt);
      expect(entry.deletedAt).toBeNull();
      expect(entry.title).toBe('Góc tĩnh lặng');
      expect(entry.body).toBe('Hôm nay trời dịu mát');
      expect(entry.mood).toBe('calm');

      // Retrieve entry
      const fetched = await repo.getEntry(entry.id);
      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(entry.id);
      expect(fetched?.title).toBe('Góc tĩnh lặng');
      expect(fetched?.body).toBe('Hôm nay trời dịu mát');
      expect(fetched?.mood).toBe('calm');

      // Update entry
      const updated = await repo.updateEntry(entry.id, {
        title: 'Góc tĩnh lặng - Chiều muộn',
        body: 'Thêm một dòng suy ngẫm',
      });
      expect(updated.title).toBe('Góc tĩnh lặng - Chiều muộn');
      expect(updated.body).toBe('Thêm một dòng suy ngẫm');
      expect(updated.mood).toBe('calm'); // preserved
      expect(updated.updatedAt).toBeGreaterThanOrEqual(entry.updatedAt);

      // Verify persistence of update
      const refetched = await repo.getEntry(entry.id);
      expect(refetched?.title).toBe('Góc tĩnh lặng - Chiều muộn');
      expect(refetched?.body).toBe('Thêm một dòng suy ngẫm');
    });

    it('throws error when updating non-existent entry', async () => {
      await expect(
        repo.updateEntry('non-existent-id', { body: 'test' })
      ).rejects.toThrow('Journal entry with id "non-existent-id" not found');
    });

    it('permanently deletes an entry from the store', async () => {
      const entry = await repo.createEntry({ body: 'Cần xóa vĩnh viễn' });
      expect(await repo.getEntry(entry.id)).toBeDefined();

      await repo.permanentlyDeleteEntry(entry.id);
      expect(await repo.getEntry(entry.id)).toBeUndefined();
    });
  });

  describe('Active Entries Listing & Ordering', () => {
    it('lists active entries ordered by createdAt descending (newest first)', async () => {
      const e1 = await repo.createEntry({
        title: 'Bài viết 1',
        body: 'Nội dung 1',
        createdAt: 1000,
      });
      const e2 = await repo.createEntry({
        title: 'Bài viết 2',
        body: 'Nội dung 2',
        createdAt: 3000,
      });
      const e3 = await repo.createEntry({
        title: 'Bài viết 3',
        body: 'Nội dung 3',
        createdAt: 2000,
      });

      const list = await repo.listActiveEntries();
      expect(list.length).toBe(3);
      expect(list[0].id).toBe(e2.id); // 3000
      expect(list[1].id).toBe(e3.id); // 2000
      expect(list[2].id).toBe(e1.id); // 1000
    });

    it('filters out soft-deleted entries from active list', async () => {
      const e1 = await repo.createEntry({ title: 'Hoạt động', body: 'Đang hiển thị' });
      const e2 = await repo.createEntry({ title: 'Đã xóa', body: 'Đã vào thùng rác' });

      await repo.softDeleteEntry(e2.id);

      const activeList = await repo.listActiveEntries();
      expect(activeList.length).toBe(1);
      expect(activeList[0].id).toBe(e1.id);

      const allList = await repo.listEntries(true);
      expect(allList.length).toBe(2);
    });
  });

  describe('Soft Delete & 10s Undo Window', () => {
    it('supports soft-delete with undo capability', async () => {
      const entry = await repo.createEntry({ title: 'Tạm xóa', body: 'Nội dung' });

      // Soft delete
      const deleted = await repo.softDeleteEntry(entry.id);
      expect(deleted.deletedAt).toBeTypeOf('number');

      let list = await repo.listActiveEntries();
      expect(list.some((e) => e.id === entry.id)).toBe(false);

      // Entry still exists in raw store
      const rawEntry = await repo.getEntry(entry.id);
      expect(rawEntry).toBeDefined();
      expect(rawEntry?.deletedAt).not.toBeNull();

      // Undo delete
      const restored = await repo.undoDelete(entry.id);
      expect(restored.deletedAt).toBeNull();

      list = await repo.listActiveEntries();
      expect(list.some((e) => e.id === entry.id)).toBe(true);
    });

    it('purges soft-deleted entries older than 10-second undo window while keeping recent ones', async () => {
      const now = Date.now();

      // 1. Entry deleted 15 seconds ago (expired outside 10s undo window)
      const expiredEntry = await repo.createEntry({
        title: 'Mục hết hạn undo',
        body: 'Nội dung hết hạn',
      });
      await repo.updateEntry(expiredEntry.id, {
        deletedAt: now - 15000,
      });

      // 2. Entry deleted 3 seconds ago (within 10s undo window)
      const recentEntry = await repo.createEntry({
        title: 'Mục vừa xóa',
        body: 'Vẫn còn trong 10s',
      });
      await repo.updateEntry(recentEntry.id, {
        deletedAt: now - 3000,
      });

      // 3. Active entry (never deleted)
      const activeEntry = await repo.createEntry({
        title: 'Mục đang hoạt động',
        body: 'Không bị ảnh hưởng',
      });

      // Purge with default 10,000ms (10 seconds) window
      const purgedCount = await repo.purgeExpiredDeletes(10000);
      expect(purgedCount).toBe(1);

      // Expired entry should be completely removed
      expect(await repo.getEntry(expiredEntry.id)).toBeUndefined();

      // Recent entry should still exist in store (can still be undone)
      const fetchedRecent = await repo.getEntry(recentEntry.id);
      expect(fetchedRecent).toBeDefined();
      expect(fetchedRecent?.deletedAt).not.toBeNull();

      // Active entry remains untouched
      const fetchedActive = await repo.getEntry(activeEntry.id);
      expect(fetchedActive).toBeDefined();
      expect(fetchedActive?.deletedAt).toBeNull();

      // Undo recent entry works
      await repo.undoDelete(recentEntry.id);
      const activeList = await repo.listActiveEntries();
      expect(activeList.some((e) => e.id === recentEntry.id)).toBe(true);
    });
  });

  describe('Drafts Management', () => {
    it('saves, retrieves, updates, and clears singleton draft via repository', async () => {
      // Initially no draft
      const initial = await repo.getDraft();
      expect(initial).toBeUndefined();

      // Save new draft
      const saved = await repo.saveDraft({
        title: 'Bản nháp ban đầu',
        body: 'Đang viết dở dang...',
        mood: 'reflective',
      });
      expect(saved.id).toBe(DEFAULT_DRAFT_ID);
      expect(saved.title).toBe('Bản nháp ban đầu');
      expect(saved.body).toBe('Đang viết dở dang...');
      expect(saved.mood).toBe('reflective');
      expect(saved.updatedAt).toBeTypeOf('number');

      // Retrieve draft
      const fetched = await repo.getDraft();
      expect(fetched).toEqual(saved);

      // Update draft (autosave simulation)
      const updated = await repo.saveDraft({
        title: 'Bản nháp cập nhật',
        body: 'Thêm nhiều suy nghĩ mới...',
        mood: 'calm',
      });
      expect(updated.title).toBe('Bản nháp cập nhật');
      expect(updated.body).toBe('Thêm nhiều suy nghĩ mới...');

      // Clear draft
      await repo.clearDraft();
      expect(await repo.getDraft()).toBeUndefined();
    });

    it('supports DraftRepository and standalone drafts helper functions', async () => {
      const draftRepo = new DraftRepository(TEST_DB);
      await draftRepo.init();

      await draftRepo.saveDraft({
        title: 'Standalone Draft',
        body: 'Nội dung standalone',
        mood: 'peaceful',
      });

      const retrieved = await draftRepo.getDraft();
      expect(retrieved?.title).toBe('Standalone Draft');
      expect(retrieved?.body).toBe('Nội dung standalone');

      await draftRepo.clearDraft();
      expect(await draftRepo.getDraft()).toBeUndefined();
      await draftRepo.close();
    });

    it('standalone helpers saveDraft, getDraft, clearDraft work with specified db', async () => {
      await saveDraft({ title: 'Helper Draft', body: 'Helper Body' }, TEST_DB);
      const draft = await getDraft(TEST_DB);
      expect(draft?.title).toBe('Helper Draft');
      expect(draft?.body).toBe('Helper Body');

      await clearDraft(TEST_DB);
      expect(await getDraft(TEST_DB)).toBeUndefined();
    });
  });

  describe('Stress & Unicode Support', () => {
    it('stores and retrieves large journal body with 15,000+ characters without loss', async () => {
      const paragraph = 'Ánh trăng nhẹ nhàng soi rọi qua khung cửa sổ, mang lại sự bình yên trong tâm hồn. ';
      const repeatCount = Math.ceil(15000 / paragraph.length) + 10;
      const largeBody = paragraph.repeat(repeatCount);
      expect(largeBody.length).toBeGreaterThan(15000);

      const entry = await repo.createEntry({
        title: 'Bài viết dung lượng lớn',
        body: largeBody,
        mood: 'serene',
      });

      const retrieved = await repo.getEntry(entry.id);
      expect(retrieved?.body.length).toBe(largeBody.length);
      expect(retrieved?.body).toBe(largeBody);
    });

    it('faithfully preserves complex Vietnamese diacritics and symbols', async () => {
      const vietnameseTitle = 'Góc tĩnh lặng của tâm hồn — Nơi trú ngụ an yên';
      const vietnameseBody =
        'Hôm nay tôi thấy lòng nhẹ nhõm như áng mây trôi lững lờ giữa bầu trời xanh biếc. ' +
        'Những âu lo, phiền muộn dường như tan biến vào hư không khi đặt bút viết xuống từng dòng chữ này. ' +
        '«Trời đất thênh thang, tâm hồn an lạc!» — 🌿☕✨';

      const entry = await repo.createEntry({
        title: vietnameseTitle,
        body: vietnameseBody,
        mood: 'thanh-thản',
      });

      const retrieved = await repo.getEntry(entry.id);
      expect(retrieved?.title).toBe(vietnameseTitle);
      expect(retrieved?.body).toBe(vietnameseBody);
      expect(retrieved?.mood).toBe('thanh-thản');
    });
  });
});
