<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { JournalRepository } from '../lib/db/repository';
  import type { JournalEntry } from '../lib/db/schema';
  import { MorphIcon } from 'morphicons/svelte';
  import { Search, Calendar, List, Download, Upload, X } from 'lucide';
  import {
    groupEntriesByPeriod,
    formatFullDateTime,
    formatShortDate,
    calculateReadingStats,
    countEntriesByMood,
  } from '../lib/journal/timeline';
  import { BackupManager } from '../lib/export/backup';

  export function normalizeVietnamese(text: string): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  interface Props {
    entries?: JournalEntry[];
    repo?: JournalRepository;
    repository?: JournalRepository;
    refreshTrigger?: number;
    onEntryDeleted?: (entry: JournalEntry) => void;
    onEntryUndo?: (entry: JournalEntry) => void;
    onSelectEntry?: (entry: JournalEntry) => void;
    onEditEntry?: (entry: JournalEntry) => void;
  }

  let props: Props = $props();

  let activeRepo = $derived(props.repo || props.repository);
  let internalEntries = $state<JournalEntry[]>([]);
  let searchQuery = $state('');
  let selectedMood = $state<string | null>(null);
  let viewMode = $state<'timeline' | 'list'>('timeline');
  let selectedEntry = $state<JournalEntry | null>(null);

  // Backup & Import feedback
  let backupStatus = $state<'idle' | 'success' | 'error'>('idle');
  let backupMessage = $state<string>('');
  let fileInputRef = $state<HTMLInputElement | null>(null);

  // Undo delete state
  let pendingUndoEntry = $state<JournalEntry | null>(null);
  let undoCountdown = $state(10);
  let undoTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let undoIntervalId: ReturnType<typeof setInterval> | null = null;

  const MOOD_MAP: Record<string, { label: string; icon: string }> = {
    calm: { label: 'Bình an', icon: '🍃' },
    grateful: { label: 'Biết ơn', icon: '✨' },
    reflective: { label: 'Trầm tư', icon: '🌙' },
    peaceful: { label: 'Tĩnh lặng', icon: '🕊️' },
    hopeful: { label: 'Hy vọng', icon: '☀️' },
  };

  const MOOD_LIST = [
    { id: 'calm', label: 'Bình an', icon: '🍃' },
    { id: 'grateful', label: 'Biết ơn', icon: '✨' },
    { id: 'reflective', label: 'Trầm tư', icon: '🌙' },
    { id: 'peaceful', label: 'Tĩnh lặng', icon: '🕊️' },
    { id: 'hopeful', label: 'Hy vọng', icon: '☀️' },
  ];

  export async function refresh() {
    const targetRepo = activeRepo;
    if (targetRepo) {
      try {
        await targetRepo.init();
        internalEntries = await targetRepo.listActiveEntries();
      } catch (err) {
        console.error('Failed to load journal entries:', err);
      }
    }
  }

  // Sync props
  $effect(() => {
    if (props.entries !== undefined) {
      internalEntries = [...props.entries];
    }
  });

  $effect(() => {
    if (props.refreshTrigger !== undefined && activeRepo) {
      refresh();
    }
  });

  onMount(async () => {
    if (props.entries !== undefined) {
      internalEntries = [...props.entries];
    } else if (activeRepo) {
      await refresh();
    }
  });

  onDestroy(() => {
    clearUndoTimers();
  });

  function clearUndoTimers() {
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      undoTimeoutId = null;
    }
    if (undoIntervalId) {
      clearInterval(undoIntervalId);
      undoIntervalId = null;
    }
  }

  async function handleDelete(entry: JournalEntry) {
    clearUndoTimers();

    if (selectedEntry?.id === entry.id) {
      selectedEntry = null;
    }

    internalEntries = internalEntries.filter((e) => e.id !== entry.id);
    pendingUndoEntry = entry;
    undoCountdown = 10;

    const targetRepo = activeRepo;
    if (targetRepo) {
      try {
        await targetRepo.softDeleteEntry(entry.id);
      } catch (err) {
        console.error('Error soft-deleting entry:', err);
      }
    }

    props.onEntryDeleted?.(entry);

    undoIntervalId = setInterval(() => {
      undoCountdown -= 1;
      if (undoCountdown <= 0) {
        if (undoIntervalId) clearInterval(undoIntervalId);
      }
    }, 1000);

    undoTimeoutId = setTimeout(async () => {
      clearUndoTimers();
      if (pendingUndoEntry && activeRepo) {
        try {
          await activeRepo.purgeExpiredDeletes(10000);
        } catch (err) {
          console.warn('Purge expired deletes error:', err);
        }
      }
      pendingUndoEntry = null;
    }, 10000);
  }

  async function handleUndo() {
    if (!pendingUndoEntry) return;

    const restoredEntry = pendingUndoEntry;
    clearUndoTimers();
    pendingUndoEntry = null;

    const targetRepo = activeRepo;
    if (targetRepo) {
      try {
        await targetRepo.undoDelete(restoredEntry.id);
      } catch (err) {
        console.error('Error restoring entry:', err);
      }
    }

    internalEntries = [restoredEntry, ...internalEntries].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    props.onEntryUndo?.(restoredEntry);
  }

  function handleSelectMood(moodId: string | null) {
    if (selectedMood === moodId) {
      selectedMood = null;
    } else {
      selectedMood = moodId;
    }
  }

  function handleClearSearch() {
    searchQuery = '';
  }

  function handleOpenDetail(entry: JournalEntry) {
    selectedEntry = entry;
    props.onSelectEntry?.(entry);
  }

  function handleCloseDetail() {
    selectedEntry = null;
  }

  function handleEditClick(entry: JournalEntry) {
    props.onEditEntry?.(entry);
  }

  // Backup Export
  async function handleExport() {
    const targetRepo = activeRepo;
    if (!targetRepo) return;

    try {
      backupStatus = 'idle';
      const manager = new BackupManager(targetRepo);
      const jsonString = await manager.exportDataAsJson();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `havenart-journal-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      backupStatus = 'success';
      backupMessage = 'Đã tải tệp sao lưu JSON thành công';
      setTimeout(() => {
        backupMessage = '';
      }, 4000);
    } catch (err) {
      backupStatus = 'error';
      backupMessage = 'Không thể xuất tệp sao lưu';
      setTimeout(() => {
        backupMessage = '';
      }, 4000);
    }
  }

  // Backup Import
  function handleTriggerImport() {
    fileInputRef?.click();
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !activeRepo) return;

    try {
      const text = await file.text();
      const manager = new BackupManager(activeRepo);
      const result = await manager.importData(text, { deduplication: 'skip' });
      await refresh();

      backupStatus = 'success';
      backupMessage = `Khôi phục thành công ${result.importedCount} bài viết (${result.skippedCount} đã trùng)`;
      setTimeout(() => {
        backupMessage = '';
      }, 4000);
    } catch (err) {
      backupStatus = 'error';
      backupMessage = 'Tệp sao lưu không hợp lệ';
      setTimeout(() => {
        backupMessage = '';
      }, 4000);
    } finally {
      target.value = '';
    }
  }

  // Derived: Mood counts across all active entries
  let moodCounts = $derived.by(() => {
    return countEntriesByMood(internalEntries);
  });

  // Derived: Filtered entries (diacritic-insensitive search + mood filter)
  let filteredEntries = $derived.by(() => {
    const q = normalizeVietnamese(searchQuery);

    return internalEntries.filter((entry) => {
      // 1. Mood filter
      if (selectedMood !== null && entry.mood !== selectedMood) {
        return false;
      }

      // 2. Search query filter
      if (q) {
        const titleNorm = normalizeVietnamese(entry.title || '');
        const bodyNorm = normalizeVietnamese(entry.body || '');
        const dateFormatted = normalizeVietnamese(formatShortDate(entry.createdAt));
        if (!titleNorm.includes(q) && !bodyNorm.includes(q) && !dateFormatted.includes(q)) {
          return false;
        }
      }

      return true;
    });
  });

  // Derived: Chronological groups for timeline mode
  let timelineGroups = $derived.by(() => {
    return groupEntriesByPeriod(filteredEntries);
  });

  // Derived: Total words count
  let totalWordCount = $derived.by(() => {
    let total = 0;
    for (const e of internalEntries) {
      total += calculateReadingStats(e.body).words;
    }
    return total;
  });
</script>

<div class="w-full space-y-4 font-sans select-text">
  <!-- Hidden File Input for JSON Backup Import -->
  <input
    type="file"
    accept=".json,application/json"
    bind:this={fileInputRef}
    onchange={handleFileChange}
    class="hidden"
  />

  <!-- 1. Search Bar & Toolbar Actions -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
    <!-- Search Input -->
    <div class="relative flex-1">
      <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/50">
        <MorphIcon
          icon={Search}
          size={15}
          strokeWidth={1.75}
          spring="smooth"
          reducedMotion="user"
        />
      </div>
      <input
        type="text"
        placeholder="Tìm kiếm bài viết, ngày tháng..."
        bind:value={searchQuery}
        class="w-full pl-10 pr-9 py-2 rounded-2xl bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 focus:border-white/40 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 text-sm font-light transition-colors backdrop-blur-md"
      />
      {#if searchQuery}
        <button
          type="button"
          onclick={handleClearSearch}
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white cursor-pointer"
          title="Xóa tìm kiếm"
        >
          <MorphIcon icon={X} size={14} strokeWidth={2} />
        </button>
      {/if}
    </div>

    <!-- View Mode Toggles & Backup Actions -->
    <div class="flex items-center gap-1.5 self-end sm:self-auto">
      <!-- Timeline vs Flat List Mode Toggle -->
      <div class="inline-flex rounded-full p-0.5 bg-white/5 border border-white/15">
        <button
          type="button"
          onclick={() => (viewMode = 'timeline')}
          class="px-2.5 py-1 rounded-full text-xs font-light transition-all cursor-pointer flex items-center gap-1.5 {viewMode === 'timeline'
            ? 'bg-white/20 text-white shadow-sm'
            : 'text-white/60 hover:text-white'}"
          title="Xem theo dòng thời gian ngày tháng"
        >
          <MorphIcon icon={Calendar} size={13} strokeWidth={1.75} />
          <span class="hidden md:inline">Thời gian</span>
        </button>
        <button
          type="button"
          onclick={() => (viewMode = 'list')}
          class="px-2.5 py-1 rounded-full text-xs font-light transition-all cursor-pointer flex items-center gap-1.5 {viewMode === 'list'
            ? 'bg-white/20 text-white shadow-sm'
            : 'text-white/60 hover:text-white'}"
          title="Xem danh sách liên tục"
        >
          <MorphIcon icon={List} size={13} strokeWidth={1.75} />
          <span class="hidden md:inline">Danh sách</span>
        </button>
      </div>

      <!-- Backup Export Button -->
      {#if activeRepo}
        <button
          type="button"
          onclick={handleExport}
          class="p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white text-xs font-light transition-all flex items-center gap-1 cursor-pointer"
          title="Xuất bản sao lưu dữ liệu JSON"
        >
          <MorphIcon icon={Download} size={13} strokeWidth={1.75} />
          <span class="hidden lg:inline">Sao lưu</span>
        </button>
        <button
          type="button"
          onclick={handleTriggerImport}
          class="p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white text-xs font-light transition-all flex items-center gap-1 cursor-pointer"
          title="Khôi phục nhật ký từ tệp JSON"
        >
          <MorphIcon icon={Upload} size={13} strokeWidth={1.75} />
          <span class="hidden lg:inline">Nhập</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Backup Toast Notification -->
  {#if backupMessage}
    <div
      role="status"
      class="px-3.5 py-2 rounded-xl text-xs font-light text-center transition-all duration-300 backdrop-blur-md {backupStatus === 'success'
        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
        : 'bg-rose-500/20 text-rose-200 border border-rose-500/30'}"
    >
      {backupMessage}
    </div>
  {/if}

  <!-- 2. Mood Filter Chips Bar -->
  <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
    <button
      type="button"
      onclick={() => handleSelectMood(null)}
      class="px-3 py-1 rounded-full whitespace-nowrap transition-all duration-200 border cursor-pointer {selectedMood === null
        ? 'bg-white/20 border-white/40 text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.15)]'
        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'}"
    >
      Tất cả ({internalEntries.length})
    </button>
    {#each MOOD_LIST as m}
      <button
        type="button"
        onclick={() => handleSelectMood(m.id)}
        class="px-3 py-1 rounded-full whitespace-nowrap transition-all duration-200 border cursor-pointer flex items-center gap-1 {selectedMood === m.id
          ? 'bg-white/20 border-white/40 text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.15)]'
          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'}"
      >
        <span>{m.icon}</span>
        <span>{m.label}</span>
        <span class="text-[10px] opacity-75">({moodCounts[m.id] || 0})</span>
      </button>
    {/each}
  </div>

  <!-- 3. Summary & Filter Feedback Bar -->
  {#if searchQuery || selectedMood !== null}
    <div class="flex items-center justify-between px-2 text-xs text-white/60 font-light">
      <span>
        Tìm thấy <strong class="text-white font-medium">{filteredEntries.length}</strong> bài viết
        {#if selectedMood}
          với tâm trạng <span class="text-white">{MOOD_MAP[selectedMood]?.label}</span>
        {/if}
        {#if searchQuery}
          cho từ khóa <span class="text-white font-serif italic">"{searchQuery}"</span>
        {/if}
      </span>
      <button
        type="button"
        onclick={() => {
          searchQuery = '';
          selectedMood = null;
        }}
        class="text-xs text-white/50 hover:text-white underline cursor-pointer"
      >
        Đặt lại bộ lọc
      </button>
    </div>
  {:else if internalEntries.length > 0}
    <div class="flex items-center justify-between px-2 text-[11px] text-white/50 font-light">
      <span>Tổng cộng {internalEntries.length} bài viết • {totalWordCount.toLocaleString()} từ an yên</span>
      <span>Nhấp vào bài viết để đọc lại toàn văn</span>
    </div>
  {/if}

  <!-- 10-Second Undo Banner -->
  {#if pendingUndoEntry}
    <div
      role="status"
      class="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white shadow-sm transition-all duration-300 backdrop-blur-md"
    >
      <div class="flex items-center gap-2 text-xs sm:text-sm font-light">
        <span class="inline-block w-2 h-2 rounded-full bg-white/80 animate-ping"></span>
        <span>Đã xóa bài viết. Tự động xoá vĩnh viễn sau {undoCountdown}s</span>
      </div>
      <button
        type="button"
        onclick={handleUndo}
        class="text-xs sm:text-sm font-medium text-white underline hover:text-white/80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
      >
        Hoàn tác
      </button>
    </div>
  {/if}

  <!-- 4. Reading View Modal (Khi người dùng chọn đọc 1 bài viết chi tiết) -->
  {#if selectedEntry}
    <div class="p-5 sm:p-6 rounded-3xl bg-black/40 border border-white/20 backdrop-blur-2xl shadow-xl space-y-4 animate-fade-in">
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <button
          type="button"
          onclick={handleCloseDetail}
          class="text-xs font-light text-white/70 hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 transition-all cursor-pointer"
        >
          ← Quay lại danh sách
        </button>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={() => handleEditClick(selectedEntry!)}
            class="text-xs font-light text-white/85 hover:text-white px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer"
          >
            Chỉnh sửa
          </button>
          <button
            type="button"
            onclick={() => handleDelete(selectedEntry!)}
            class="text-xs font-light text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
          >
            Xóa bài
          </button>
        </div>
      </div>

      <!-- Full Entry Heading -->
      <div>
        <h2 class="text-2xl font-serif font-medium text-white leading-snug">
          {selectedEntry.title || 'Không tiêu đề'}
        </h2>
        <div class="flex flex-wrap items-center gap-2.5 mt-2 text-xs text-white/60 font-light">
          <time datetime={new Date(selectedEntry.createdAt).toISOString()}>
            {formatFullDateTime(selectedEntry.createdAt)}
          </time>
          {#if selectedEntry.mood && MOOD_MAP[selectedEntry.mood]}
            <span>•</span>
            <span class="inline-flex items-center gap-1 text-white/85">
              <span>{MOOD_MAP[selectedEntry.mood].icon}</span>
              <span>{MOOD_MAP[selectedEntry.mood].label}</span>
            </span>
          {/if}
          <span>•</span>
          <span>{calculateReadingStats(selectedEntry.body).words} từ</span>
        </div>
      </div>

      <!-- Full Entry Body -->
      <div class="pt-2 pb-4 text-stone-200 font-sans text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words border-t border-white/5">
        {selectedEntry.body}
      </div>
    </div>
  {:else}
    <!-- 5. Entries Display (Timeline vs Flat List) -->
    {#if filteredEntries.length === 0}
      <div class="py-12 text-center text-white/80 font-normal text-sm leading-relaxed">
        {searchQuery || selectedMood
          ? 'Không tìm thấy bài viết nào phù hợp với bộ lọc.'
          : 'Chưa có bài viết nào. Hãy lưu lại khoảnh khắc đầu tiên của bạn.'}
      </div>
    {:else}
      <div class="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        {#if viewMode === 'timeline'}
          <!-- Grouped Timeline Mode -->
          {#each timelineGroups as group (group.periodKey)}
            <div class="space-y-2.5">
              <!-- Period Group Header -->
              <div class="sticky top-0 z-10 py-1 px-1 flex items-center justify-between text-xs font-serif font-medium text-white/70 tracking-wider uppercase border-b border-white/10 backdrop-blur-md bg-black/40">
                <span class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                  <span>{group.label}</span>
                </span>
                <span class="text-[11px] font-sans text-white/40 normal-case">{group.entries.length} bài</span>
              </div>

              <!-- Entries in this Period -->
              <div class="space-y-2.5">
                {#each group.entries as entry (entry.id)}
                  <article
                    class="p-4 sm:p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-md group"
                  >
                    <!-- Header inside article: Title, Mood, Date, Actions (NO SVGs in article) -->
                    <div class="flex items-start justify-between gap-3 mb-2">
                      <div class="flex-1 min-w-0">
                        <h3 class="text-base font-serif font-medium text-white/95 truncate">
                          <button
                            type="button"
                            onclick={() => handleOpenDetail(entry)}
                            class="text-left hover:text-amber-300 transition-colors focus:outline-none focus-visible:underline cursor-pointer"
                          >
                            {entry.title || 'Không tiêu đề'}
                          </button>
                        </h3>
                        <div class="flex flex-wrap items-center gap-2 mt-1 text-xs text-white/50 font-light">
                          <time datetime={new Date(entry.createdAt).toISOString()}>{formatShortDate(entry.createdAt)}</time>
                          {#if entry.mood && MOOD_MAP[entry.mood]}
                            <span>•</span>
                            <span class="inline-flex items-center gap-1 text-white/80">
                              <span>{MOOD_MAP[entry.mood].icon}</span>
                              <span>{MOOD_MAP[entry.mood].label}</span>
                            </span>
                          {/if}
                          <span>•</span>
                          <span>{calculateReadingStats(entry.body).words} từ</span>
                        </div>
                      </div>

                      <!-- Article Action buttons (Plain buttons, no SVG inside article for XSS invariant) -->
                      <div class="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onclick={() => handleOpenDetail(entry)}
                          aria-label="Xem chi tiết"
                          class="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onclick={() => handleEditClick(entry)}
                          aria-label="Sửa bài viết"
                          class="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onclick={() => handleDelete(entry)}
                          aria-label="Xóa bài viết"
                          class="text-xs text-white/40 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    <!-- Entry Snippet Body (Zero innerHTML) -->
                    <button
                      type="button"
                      onclick={() => handleOpenDetail(entry)}
                      class="text-left w-full text-sm font-light text-white/80 leading-relaxed line-clamp-3 break-words hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded"
                    >
                      {entry.body}
                    </button>
                  </article>
                {/each}
              </div>
            </div>
          {/each}
        {:else}
          <!-- Flat List Mode -->
          <div class="space-y-3">
            {#each filteredEntries as entry (entry.id)}
              <article
                class="p-4 sm:p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-md group"
              >
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div class="flex-1 min-w-0">
                    <h3 class="text-base font-serif font-medium text-white/95 truncate">
                      <button
                        type="button"
                        onclick={() => handleOpenDetail(entry)}
                        class="text-left hover:text-amber-300 transition-colors focus:outline-none focus-visible:underline cursor-pointer"
                      >
                        {entry.title || 'Không tiêu đề'}
                      </button>
                    </h3>
                    <div class="flex items-center gap-2 mt-1 text-xs text-white/50 font-light">
                      <time datetime={new Date(entry.createdAt).toISOString()}>{formatShortDate(entry.createdAt)}</time>
                      {#if entry.mood && MOOD_MAP[entry.mood]}
                        <span>•</span>
                        <span class="inline-flex items-center gap-1 text-white/80">
                          <span>{MOOD_MAP[entry.mood].icon}</span>
                          <span>{MOOD_MAP[entry.mood].label}</span>
                        </span>
                      {/if}
                      <span>•</span>
                      <span>{calculateReadingStats(entry.body).words} từ</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onclick={() => handleOpenDetail(entry)}
                      aria-label="Xem chi tiết"
                      class="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Xem
                    </button>
                    <button
                      type="button"
                      onclick={() => handleEditClick(entry)}
                      aria-label="Sửa bài viết"
                      class="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onclick={() => handleDelete(entry)}
                      aria-label="Xóa bài viết"
                      class="text-xs text-white/40 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onclick={() => handleOpenDetail(entry)}
                  class="text-left w-full text-sm font-light text-white/80 leading-relaxed line-clamp-3 break-words hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded"
                >
                  {entry.body}
                </button>
              </article>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
