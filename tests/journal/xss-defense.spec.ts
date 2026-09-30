import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import JournalList from '../../src/components/JournalList.svelte';
import WritePanel from '../../src/components/WritePanel.svelte';
import { JournalRepository } from '../../src/lib/db/repository';
import { DEFAULT_DRAFT_ID } from '../../src/lib/db/schema';

describe('Journal XSS Defense & Safe Rendering', () => {
  let testRepo: JournalRepository;
  const TEST_DB = 'test-haven-journal-xss';

  beforeEach(async () => {
    testRepo = new JournalRepository(TEST_DB);
    await testRepo.init();
  });

  afterEach(async () => {
    await testRepo.close();
    indexedDB.deleteDatabase(TEST_DB);
    vi.restoreAllMocks();
  });

  describe('XSS Defense Invariant', () => {
    it('renders dangerous html tags strictly as text without innerHTML execution', () => {
      const hostileEntries = [
        {
          id: 'test-1',
          title: 'Tấn công XSS <script>alert("title-pwned")</script>',
          body: '<script>window.pwned=true</script><img src="x" onerror="alert(1)"><iframe src="javascript:alert(2)"></iframe>',
          mood: 'calm',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        },
      ];

      const { container } = render(JournalList, { entries: hostileEntries });

      // No executable elements must exist in the DOM
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img[onerror]')).toBeNull();
      expect(container.querySelector('iframe')).toBeNull();

      // Raw strings must be safely rendered as literal text
      expect(container.textContent).toContain('<script>window.pwned=true</script>');
      expect(container.textContent).toContain('<img src="x" onerror="alert(1)">');
      expect(container.textContent).toContain('<script>alert("title-pwned")</script>');
    });

    it('renders multiple hostile HTML attack vectors as plain text without parsing them as DOM', () => {
      const hostileEntries = [
        {
          id: 'test-vectors',
          title: '<b>Bold</b> <svg onload="alert(3)"></svg>',
          body: '<style>body { display: none; }</style><a href="javascript:void(0)">Link</a>',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        },
      ];

      const { container } = render(JournalList, { entries: hostileEntries });

      expect(container.querySelector('svg[onload]')).toBeNull();
      expect(container.querySelector('article svg')).toBeNull();
      expect(container.querySelector('style')).toBeNull();
      expect(container.querySelector('b')).toBeNull();
      expect(container.textContent).toContain('<b>Bold</b>');
      expect(container.textContent).toContain('<svg onload="alert(3)"></svg>');
      expect(container.textContent).toContain('<style>body { display: none; }</style>');
    });
  });

  describe('WritePanel Autosave Drafts', () => {
    it('debounces autosave for 2000ms idle and saves draft to DraftRepository', async () => {
      const { getByPlaceholderText, getByText } = render(WritePanel, { repo: testRepo });

      const titleInput = getByPlaceholderText(/tiêu đề/i);
      const bodyTextarea = getByPlaceholderText(/viết những suy nghĩ/i);

      // Initially no draft
      const initialDraft = await testRepo.getDraft(DEFAULT_DRAFT_ID);
      expect(initialDraft).toBeUndefined();

      // Type in title and body
      await fireEvent.input(titleInput, { target: { value: 'Bản nháp tĩnh lặng' } });
      await fireEvent.input(bodyTextarea, { target: { value: 'Nội dung đang viết chưa lưu...' } });

      // Immediately after typing, 2000ms has not elapsed, so draft is not yet persisted
      const immediateDraft = await testRepo.getDraft(DEFAULT_DRAFT_ID);
      expect(immediateDraft).toBeUndefined();

      // Wait for the 2000ms debounce to complete and draft to be saved
      await waitFor(
        async () => {
          const savedDraft = await testRepo.getDraft(DEFAULT_DRAFT_ID);
          expect(savedDraft).toBeDefined();
          expect(savedDraft?.title).toBe('Bản nháp tĩnh lặng');
          expect(savedDraft?.body).toBe('Nội dung đang viết chưa lưu...');
        },
        { timeout: 3500 }
      );

      // Check for serene "Đã lưu nháp" status indicator
      expect(getByText(/đã lưu nháp/i)).toBeDefined();
    });

    it('loads existing draft on mount if available', async () => {
      // Pre-seed draft in repository
      await testRepo.saveDraft({
        id: DEFAULT_DRAFT_ID,
        title: 'Bản nháp từ hôm qua',
        body: 'Nội dung tiếp tục suy ngẫm',
        mood: 'calm',
      });

      const { getByPlaceholderText } = render(WritePanel, { repo: testRepo });

      await waitFor(() => {
        const titleInput = getByPlaceholderText(/tiêu đề/i) as HTMLInputElement;
        const bodyTextarea = getByPlaceholderText(/viết những suy nghĩ/i) as HTMLTextAreaElement;
        expect(titleInput.value).toBe('Bản nháp từ hôm qua');
        expect(bodyTextarea.value).toBe('Nội dung tiếp tục suy ngẫm');
      });
    });

    it('creates journal entry, clears draft, and calls onSave callback', async () => {
      let savedEntryCallback: any = null;
      const { getByPlaceholderText, getByRole } = render(WritePanel, {
        repo: testRepo,
        onSave: (entry: any) => {
          savedEntryCallback = entry;
        },
      });

      const titleInput = getByPlaceholderText(/tiêu đề/i);
      const bodyTextarea = getByPlaceholderText(/viết những suy nghĩ/i);

      await fireEvent.input(titleInput, { target: { value: 'Hôm nay an yên' } });
      await fireEvent.input(bodyTextarea, { target: { value: 'Mọi âu lo tan biến vào không gian.' } });

      const saveButton = getByRole('button', { name: /lưu bài viết/i });
      await fireEvent.click(saveButton);

      await waitFor(async () => {
        expect(savedEntryCallback).not.toBeNull();
        expect(savedEntryCallback.title).toBe('Hôm nay an yên');
        expect(savedEntryCallback.body).toBe('Mọi âu lo tan biến vào không gian.');

        // Draft should be cleared
        const draft = await testRepo.getDraft(DEFAULT_DRAFT_ID);
        expect(draft).toBeUndefined();

        // Form fields reset
        expect((titleInput as HTMLInputElement).value).toBe('');
        expect((bodyTextarea as HTMLTextAreaElement).value).toBe('');
      });
    });
  });

  describe('JournalList Soft Delete & 10s Undo Banner', () => {
    it('performs soft delete and allows undo within 10s window', async () => {
      const entry1 = await testRepo.createEntry({
        title: 'Bài viết 1',
        body: 'Nội dung 1',
        mood: 'calm',
      });

      const { getByText, queryByText, getByRole } = render(JournalList, {
        repo: testRepo,
      });

      // Entry 1 should appear in list
      await waitFor(() => {
        expect(getByText('Bài viết 1')).toBeDefined();
      });

      // Click delete button
      const deleteBtn = getByRole('button', { name: /xóa/i });
      await fireEvent.click(deleteBtn);

      // Verify soft delete occurred in repo
      await waitFor(async () => {
        const stored = await testRepo.getEntry(entry1.id);
        expect(stored?.deletedAt).not.toBeNull();
        // Entry disappears from active list
        expect(queryByText('Bài viết 1')).toBeNull();
      });

      // Undo banner should be present
      const undoBtn = getByRole('button', { name: /hoàn tác/i });
      expect(undoBtn).toBeDefined();

      // Click Hoàn tác (Undo)
      await fireEvent.click(undoBtn);

      // Verify undo in repo and reappearance in UI
      await waitFor(async () => {
        const restored = await testRepo.getEntry(entry1.id);
        expect(restored?.deletedAt).toBeNull();
        expect(getByText('Bài viết 1')).toBeDefined();
      });
    });
  });

  describe('Vietnamese Diacritic-Insensitive Search', () => {
    it('filters entries matching case and diacritics variations', async () => {
      const entries = [
        {
          id: 'vn-1',
          title: 'Bình Yên Giữa Đời',
          body: 'Tâm tĩnh lặng như mặt hồ không gợn sóng',
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
          deletedAt: null,
        },
        {
          id: 'vn-2',
          title: 'Ánh Nắng Ban Mai',
          body: 'Chào ngày mới ngập tràn yêu thương và hy vọng',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        },
      ];

      const { getByPlaceholderText, getByText, queryByText } = render(JournalList, {
        entries,
      });

      const searchInput = getByPlaceholderText(/tìm kiếm/i);

      // Search with unaccented lower: "binh yen" -> should match "Bình Yên Giữa Đời"
      await fireEvent.input(searchInput, { target: { value: 'binh yen' } });
      expect(getByText('Bình Yên Giữa Đời')).toBeDefined();
      expect(queryByText('Ánh Nắng Ban Mai')).toBeNull();

      // Search matching body with diacritics: "tinh lang" -> should match body "Tâm tĩnh lặng..."
      await fireEvent.input(searchInput, { target: { value: 'tinh lang' } });
      expect(getByText('Bình Yên Giữa Đời')).toBeDefined();
      expect(queryByText('Ánh Nắng Ban Mai')).toBeNull();

      // Search matching second entry: "anh nang"
      await fireEvent.input(searchInput, { target: { value: 'anh nang' } });
      expect(queryByText('Bình Yên Giữa Đời')).toBeNull();
      expect(getByText('Ánh Nắng Ban Mai')).toBeDefined();

      // Clear search -> both visible
      await fireEvent.input(searchInput, { target: { value: '' } });
      expect(getByText('Bình Yên Giữa Đời')).toBeDefined();
      expect(getByText('Ánh Nắng Ban Mai')).toBeDefined();
    });
  });
});
