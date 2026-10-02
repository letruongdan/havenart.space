<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { JournalRepository } from '../lib/db/repository';
  import type { JournalEntry } from '../lib/db/schema';
  import { MorphIcon } from 'morphicons/svelte';
  import { Search } from 'lucide';

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
    refreshTrigger?: number;
    onEntryDeleted?: (entry: JournalEntry) => void;
    onEntryUndo?: (entry: JournalEntry) => void;
    onSelectEntry?: (entry: JournalEntry) => void;
  }

  let props: Props = $props();

  let internalEntries = $state<JournalEntry[]>([]);
  let searchQuery = $state('');

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

  export async function refresh() {
    if (props.repo) {
      try {
        await props.repo.init();
        internalEntries = await props.repo.listActiveEntries();
      } catch (err) {
        console.error('Failed to load journal entries:', err);
      }
    }
  }

  // React to prop changes: if entries prop is passed, keep internalEntries in sync
  $effect(() => {
    if (props.entries !== undefined) {
      internalEntries = [...props.entries];
    }
  });

  // React to refreshTrigger changes
  $effect(() => {
    if (props.refreshTrigger !== undefined && props.repo) {
      refresh();
    }
  });

  onMount(async () => {
    if (props.entries !== undefined) {
      internalEntries = [...props.entries];
    } else if (props.repo) {
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

    // Remove from active list
    internalEntries = internalEntries.filter((e) => e.id !== entry.id);
    pendingUndoEntry = entry;
    undoCountdown = 10;

    if (props.repo) {
      try {
        await props.repo.softDeleteEntry(entry.id);
      } catch (err) {
        console.error('Error soft-deleting entry:', err);
      }
    }

    props.onEntryDeleted?.(entry);

    // Start 1-second countdown
    undoIntervalId = setInterval(() => {
      undoCountdown -= 1;
      if (undoCountdown <= 0) {
        if (undoIntervalId) clearInterval(undoIntervalId);
      }
    }, 1000);

    // After 10s, purge or finalize delete
    undoTimeoutId = setTimeout(async () => {
      clearUndoTimers();
      if (pendingUndoEntry && props.repo) {
        try {
          await props.repo.purgeExpiredDeletes(10000);
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

    if (props.repo) {
      try {
        await props.repo.undoDelete(restoredEntry.id);
      } catch (err) {
        console.error('Error restoring entry:', err);
      }
    }

    // Add back and sort by createdAt descending
    internalEntries = [restoredEntry, ...internalEntries].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    props.onEntryUndo?.(restoredEntry);
  }

  // Filtered entries using Vietnamese diacritic-insensitive search
  let filteredEntries = $derived.by(() => {
    const q = normalizeVietnamese(searchQuery);
    if (!q) return internalEntries;

    return internalEntries.filter((entry) => {
      const titleNorm = normalizeVietnamese(entry.title || '');
      const bodyNorm = normalizeVietnamese(entry.body || '');
      return titleNorm.includes(q) || bodyNorm.includes(q);
    });
  });

  function formatDate(timestamp: number): string {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return new Date(timestamp).toLocaleString();
    }
  }
</script>

<div class="w-full space-y-4">
  <!-- Search Filter Bar -->
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
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
      placeholder="Tìm kiếm bài viết..."
      bind:value={searchQuery}
      class="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 focus:border-white/40 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 text-sm font-light transition-colors backdrop-blur-md"
    />
  </div>

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

  <!-- Journal Entries List -->
  {#if filteredEntries.length === 0}
    <div class="py-12 text-center text-white/50 font-light text-sm">
      {searchQuery ? 'Không tìm thấy bài viết nào phù hợp.' : 'Chưa có bài viết nào. Hãy lưu lại khoảnh khắc đầu tiên của bạn.'}
    </div>
  {:else}
    <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {#each filteredEntries as entry (entry.id)}
        <article
          class="p-4 sm:p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-md group"
        >
          <!-- Entry Header: Title, Mood, Date, Actions -->
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex-1 min-w-0">
              <!-- INVARIANT: ZERO innerHTML. Raw text interpolation only -->
              <h3 class="text-base font-serif font-medium text-white/95 truncate">
                {entry.title || 'Không tiêu đề'}
              </h3>
              <div class="flex items-center gap-2 mt-1 text-xs text-white/50 font-light">
                <time datetime={new Date(entry.createdAt).toISOString()}>{formatDate(entry.createdAt)}</time>
                {#if entry.mood && MOOD_MAP[entry.mood]}
                  <span>•</span>
                  <span class="inline-flex items-center gap-1 text-white/80">
                    <span>{MOOD_MAP[entry.mood].icon}</span>
                    <span>{MOOD_MAP[entry.mood].label}</span>
                  </span>
                {/if}
              </div>
            </div>

            <!-- Delete action button -->
            <button
              type="button"
              onclick={() => handleDelete(entry)}
              aria-label="Xóa bài viết"
              class="text-xs text-white/40 hover:text-rose-400 px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
            >
              Xóa
            </button>
          </div>

          <!-- Entry Body: INVARIANT: ZERO innerHTML. Raw text interpolation only -->
          <p class="text-sm font-light text-white/80 leading-relaxed whitespace-pre-wrap break-words">
            {entry.body}
          </p>
        </article>
      {/each}
    </div>
  {/if}
</div>
