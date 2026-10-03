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

  import { t } from '../lib/i18n/store';
  import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../lib/i18n/types';

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
    lang?: SupportedLanguage;
  }

  let props: Props = $props();

  let activeLang = $derived(props.lang || DEFAULT_LANGUAGE);
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

  let moodMap = $derived<Record<string, { label: string; icon: string }>>({
    calm: { label: t('moods.calm', activeLang), icon: '🍃' },
    grateful: { label: t('moods.grateful', activeLang), icon: '✨' },
    reflective: { label: t('moods.reflective', activeLang), icon: '🌙' },
    peaceful: { label: t('moods.peaceful', activeLang), icon: '🕊️' },
    hopeful: { label: t('moods.hopeful', activeLang), icon: '☀️' },
  });

  let moodList = $derived([
    { id: 'calm', label: t('moods.calm', activeLang), icon: '🍃' },
    { id: 'grateful', label: t('moods.grateful', activeLang), icon: '✨' },
    { id: 'reflective', label: t('moods.reflective', activeLang), icon: '🌙' },
    { id: 'peaceful', label: t('moods.peaceful', activeLang), icon: '🕊️' },
    { id: 'hopeful', label: t('moods.hopeful', activeLang), icon: '☀️' },
  ]);

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
      const jsonString = await manager.exportBackup();
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
      backupMessage = activeLang === 'vi' ? 'Đã tải tệp sao lưu JSON thành công' : 'Backup JSON exported successfully';
      setTimeout(() => {
        backupMessage = '';
      }, 4000);
    } catch (err) {
      backupStatus = 'error';
      backupMessage = activeLang === 'vi' ? 'Không thể xuất tệp sao lưu' : 'Failed to export backup';
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
      backupMessage = activeLang === 'vi'
        ? `Khôi phục thành công ${result.importedCount} bài viết (${result.skippedCount} đã trùng)`
        : `Successfully imported ${result.importedCount} entries (${result.skippedCount} skipped)`;
      setTimeout(() => {
        backupMessage = '';
      }, 4000);
    } catch (err) {
      backupStatus = 'error';
      backupMessage = activeLang === 'vi' ? 'Tệp sao lưu không hợp lệ' : 'Invalid backup file';
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

  function getPeriodLabel(group: { periodKey: string; label: string }): string {
    if (group.periodKey === 'today') return t('journal.today', activeLang);
    if (group.periodKey === 'yesterday') return t('journal.yesterday', activeLang);
    if (group.periodKey === 'this-week') return t('journal.thisWeek', activeLang);
    try {
      const [yearStr, monthStr] = group.periodKey.split('-');
      if (yearStr && monthStr) {
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const date = new Date(year, month - 1, 1);
        const localeMap: Record<string, string> = {
          vi: 'vi-VN',
          en: 'en-US',
          ja: 'ja-JP',
          fr: 'fr-FR',
          ko: 'ko-KR',
          zh: 'zh-CN',
          de: 'de-DE',
          es: 'es-ES',
        };
        return date.toLocaleDateString(localeMap[activeLang] || 'en-US', { month: 'long', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return group.label;
  }
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
        placeholder={t('journal.searchPlaceholder', activeLang)}
        bind:value={searchQuery}
        class="w-full pl-10 pr-9 py-2 rounded-2xl bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 focus:border-white/40 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 text-sm font-light transition-colors backdrop-blur-md"
      />
      {#if searchQuery}
        <button
          type="button"
          onclick={handleClearSearch}
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white cursor-pointer"
          title={t('journal.close', activeLang)}
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
          title={t('journal.timeline', activeLang)}
        >
          <MorphIcon icon={Calendar} size={13} strokeWidth={1.75} />
          <span class="hidden md:inline">{t('journal.timeline', activeLang)}</span>
        </button>
        <button
          type="button"
          onclick={() => (viewMode = 'list')}
          class="px-2.5 py-1 rounded-full text-xs font-light transition-all cursor-pointer flex items-center gap-1.5 {viewMode === 'list'
            ? 'bg-white/20 text-white shadow-sm'
            : 'text-white/60 hover:text-white'}"
          title={t('journal.list', activeLang)}
        >
          <MorphIcon icon={List} size={13} strokeWidth={1.75} />
          <span class="hidden md:inline">{t('journal.list', activeLang)}</span>
        </button>
      </div>

      <!-- Backup Export Button -->
      {#if activeRepo}
        <button
          type="button"
          onclick={handleExport}
          class="p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white text-xs font-light transition-all flex items-center gap-1 cursor-pointer"
          title={t('journal.exportJson', activeLang)}
        >
          <MorphIcon icon={Download} size={13} strokeWidth={1.75} />
          <span class="hidden lg:inline">{t('journal.exportJson', activeLang)}</span>
        </button>
        <button
          type="button"
          onclick={handleTriggerImport}
          class="p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white text-xs font-light transition-all flex items-center gap-1 cursor-pointer"
          title={t('journal.importJson', activeLang)}
        >
          <MorphIcon icon={Upload} size={13} strokeWidth={1.75} />
          <span class="hidden lg:inline">{t('journal.importJson', activeLang)}</span>
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
      {t('journal.filterAll', activeLang)} ({internalEntries.length})
    </button>
    {#each moodList as m}
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
        {filteredEntries.length} {t('journal.searchFound', activeLang)}
        {#if selectedMood}
          • <span class="text-white">{moodMap[selectedMood]?.label}</span>
        {/if}
        {#if searchQuery}
          • <span class="text-white font-serif italic">"{searchQuery}"</span>
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
        {activeLang === 'vi' ? 'Đặt lại bộ lọc' : 'Reset filters'}
      </button>
    </div>
  {:else if internalEntries.length > 0}
    <div class="flex items-center justify-between px-2 text-[11px] text-white/50 font-light">
      <span>{internalEntries.length} {activeLang === 'vi' ? 'bài viết' : 'entries'} • {totalWordCount.toLocaleString()} {t('journal.wordsCount', activeLang)}</span>
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
        <span>{t('journal.confirmDelete', activeLang)} ({undoCountdown}s)</span>
      </div>
      <button
        type="button"
        onclick={handleUndo}
        aria-label="{t('journal.undoButton', activeLang)} - Hoàn tác"
        class="text-xs sm:text-sm font-medium text-white underline hover:text-white/80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
      >
        {t('journal.undoButton', activeLang)}
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
          ← {t('journal.close', activeLang)}
        </button>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={() => handleEditClick(selectedEntry!)}
            class="text-xs font-light text-white/85 hover:text-white px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer"
          >
            {t('journal.editButton', activeLang)}
          </button>
          <button
            type="button"
            onclick={() => handleDelete(selectedEntry!)}
            class="text-xs font-light text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
          >
            {t('journal.deleteButton', activeLang)}
          </button>
        </div>
      </div>

      <!-- Full Entry Heading -->
      <div>
        <h2 class="text-2xl font-serif font-medium text-white leading-snug">
          {selectedEntry.title || t('journal.untitled', activeLang)}
        </h2>
        <div class="flex flex-wrap items-center gap-2.5 mt-2 text-xs text-white/60 font-light">
          <time datetime={new Date(selectedEntry.createdAt).toISOString()}>
            {formatFullDateTime(selectedEntry.createdAt, activeLang)}
          </time>
          {#if selectedEntry.mood && moodMap[selectedEntry.mood]}
            <span>•</span>
            <span class="inline-flex items-center gap-1 text-white/85">
              <span>{moodMap[selectedEntry.mood].icon}</span>
              <span>{moodMap[selectedEntry.mood].label}</span>
            </span>
          {/if}
          <span>•</span>
          <span>{calculateReadingStats(selectedEntry.body).words} {t('journal.wordsCount', activeLang)}</span>
          <span>•</span>
          <span>{calculateReadingStats(selectedEntry.body).minutes} {t('journal.minRead', activeLang)}</span>
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
          ? (activeLang === 'vi' ? 'Không tìm thấy bài viết nào phù hợp với bộ lọc.' : 'No entries found matching filters.')
          : t('journal.emptySubtitle', activeLang)}
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
                  <span>{getPeriodLabel(group)}</span>
                </span>
                <span class="text-[11px] font-sans text-white/40 normal-case">{group.entries.length} {activeLang === 'vi' ? 'bài' : (group.entries.length === 1 ? 'entry' : 'entries')}</span>
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
                            {entry.title || t('journal.untitled', activeLang)}
                          </button>
                        </h3>
                        <div class="flex flex-wrap items-center gap-2 mt-1 text-xs text-white/50 font-light">
                          <time datetime={new Date(entry.createdAt).toISOString()}>{formatShortDate(entry.createdAt, activeLang)}</time>
                          {#if entry.mood && moodMap[entry.mood]}
                            <span>•</span>
                            <span class="inline-flex items-center gap-1 text-white/80">
                              <span>{moodMap[entry.mood].icon}</span>
                              <span>{moodMap[entry.mood].label}</span>
                            </span>
                          {/if}
                          <span>•</span>
                          <span>{calculateReadingStats(entry.body).words} {t('journal.wordsCount', activeLang)}</span>
                        </div>
                      </div>

                      <!-- Article Action buttons (Plain buttons, no SVG inside article for XSS invariant) -->
                      <div class="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onclick={() => handleOpenDetail(entry)}
                          aria-label="{t('journal.viewButton', activeLang)} - Xem"
                          class="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {t('journal.viewButton', activeLang)}
                        </button>
                        <button
                          type="button"
                          onclick={() => handleEditClick(entry)}
                          aria-label="{t('journal.editButton', activeLang)} - Sửa"
                          class="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {t('journal.editButton', activeLang)}
                        </button>
                        <button
                          type="button"
                          onclick={() => handleDelete(entry)}
                          aria-label="{t('journal.deleteButton', activeLang)} - Xóa"
                          class="text-xs text-white/40 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {t('journal.deleteButton', activeLang)}
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
                        {entry.title || t('journal.untitled', activeLang)}
                      </button>
                    </h3>
                    <div class="flex items-center gap-2 mt-1 text-xs text-white/50 font-light">
                      <time datetime={new Date(entry.createdAt).toISOString()}>{formatShortDate(entry.createdAt, activeLang)}</time>
                      {#if entry.mood && moodMap[entry.mood]}
                        <span>•</span>
                        <span class="inline-flex items-center gap-1 text-white/80">
                          <span>{moodMap[entry.mood].icon}</span>
                          <span>{moodMap[entry.mood].label}</span>
                        </span>
                      {/if}
                      <span>•</span>
                      <span>{calculateReadingStats(entry.body).words} {t('journal.wordsCount', activeLang)}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onclick={() => handleOpenDetail(entry)}
                      aria-label="{t('journal.viewButton', activeLang)} - Xem"
                      class="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {t('journal.viewButton', activeLang)}
                    </button>
                    <button
                      type="button"
                      onclick={() => handleEditClick(entry)}
                      aria-label="{t('journal.editButton', activeLang)} - Sửa"
                      class="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {t('journal.editButton', activeLang)}
                    </button>
                    <button
                      type="button"
                      onclick={() => handleDelete(entry)}
                      aria-label="{t('journal.deleteButton', activeLang)} - Xóa"
                      class="text-xs text-white/40 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {t('journal.deleteButton', activeLang)}
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
