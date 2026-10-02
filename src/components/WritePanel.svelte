<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { JournalRepository } from '../lib/db/repository';
  import { DraftRepository } from '../lib/db/drafts';
  import { DEFAULT_DRAFT_ID, type JournalEntry } from '../lib/db/schema';
  import { MorphIcon } from 'morphicons/svelte';
  import { Check } from 'lucide';
  import { t } from '../lib/i18n/store';
  import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../lib/i18n/types';

  interface Props {
    repo?: JournalRepository;
    repository?: JournalRepository;
    draftRepo?: DraftRepository;
    onSave?: (entry: JournalEntry) => void;
    onSaved?: (entry: JournalEntry) => void;
    onMoodChange?: (mood: string) => void;
    onCancelEdit?: () => void;
    initialTitle?: string;
    initialBody?: string;
    initialMood?: string;
    editingEntry?: JournalEntry | null;
    lang?: SupportedLanguage;
  }

  let props: Props = $props();

  let activeLang = $derived(props.lang || DEFAULT_LANGUAGE);

  let title = $state('');
  let body = $state('');
  let mood = $state('calm');
  let editingId = $state<string | null>(null);

  $effect(() => {
    if (props.editingEntry) {
      editingId = props.editingEntry.id;
      title = props.editingEntry.title || '';
      body = props.editingEntry.body || '';
      mood = props.editingEntry.mood || 'calm';
    } else {
      if (props.initialTitle && !title) title = props.initialTitle;
      if (props.initialBody && !body) body = props.initialBody;
      if (props.initialMood && mood === 'calm') mood = props.initialMood;
    }
  });

  let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
  let statusMessage = $state<string>('');
  let isSavingEntry = $state(false);

  let localRepo = $state<JournalRepository | null>(null);
  let activeRepo = $derived(props.repo || props.repository || localRepo);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  let moodOptions = $derived([
    { id: 'calm', label: t('moods.calm', activeLang), icon: '🍃' },
    { id: 'grateful', label: t('moods.grateful', activeLang), icon: '✨' },
    { id: 'reflective', label: t('moods.reflective', activeLang), icon: '🌙' },
    { id: 'peaceful', label: t('moods.peaceful', activeLang), icon: '🕊️' },
    { id: 'hopeful', label: t('moods.hopeful', activeLang), icon: '☀️' },
  ]);

  onMount(async () => {
    try {
      if (!props.repo && !props.repository) {
        localRepo = new JournalRepository();
        await localRepo.init();
      }

      const targetRepo = activeRepo;
      if (targetRepo && !props.editingEntry) {
        const draft = await targetRepo.getDraft(DEFAULT_DRAFT_ID);
        if (draft && !title && !body) {
          title = draft.title || '';
          body = draft.body || '';
          if (draft.mood) {
            mood = draft.mood;
            props.onMoodChange?.(draft.mood);
          }
        }
      }
    } catch (err) {
      console.error('WritePanel initialization error:', err);
    }
  });

  onDestroy(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (localRepo) {
      localRepo.close().catch(() => {});
    }
  });

  function triggerAutosave() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // After 2000ms idle, save draft to DraftRepository
    debounceTimer = setTimeout(async () => {
      const targetRepo = activeRepo;
      if (!targetRepo) return;

      // Only save if there is some content
      if (!title.trim() && !body.trim()) {
        saveStatus = 'idle';
        statusMessage = '';
        return;
      }

      try {
        saveStatus = 'saving';
        statusMessage = t('write.saving', activeLang);
        await targetRepo.saveDraft({
          id: DEFAULT_DRAFT_ID,
          title,
          body,
          mood,
        });
        saveStatus = 'saved';
        statusMessage = t('write.draftSaved', activeLang);
      } catch (err) {
        console.error('Draft autosave error:', err);
        saveStatus = 'idle';
        statusMessage = '';
      }
    }, 2000);
  }

  function handleTitleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    title = target.value;
    triggerAutosave();
  }

  function handleBodyInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    body = target.value;
    triggerAutosave();
  }

  function handleSelectMood(newMood: string) {
    mood = newMood;
    props.onMoodChange?.(newMood);
    triggerAutosave();
  }

  function handleCancelEdit() {
    editingId = null;
    title = '';
    body = '';
    mood = 'calm';
    saveStatus = 'idle';
    statusMessage = '';
    props.onCancelEdit?.();
  }

  async function handleSaveEntry() {
    if (isSavingEntry) return;
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle && !trimmedBody) {
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    isSavingEntry = true;
    try {
      const targetRepo = activeRepo;
      if (!targetRepo) throw new Error('Repository not ready');

      let entry: JournalEntry;
      if (editingId) {
        entry = await targetRepo.updateEntry(editingId, {
          title: trimmedTitle,
          body: trimmedBody,
          mood,
        });
      } else {
        entry = await targetRepo.createEntry({
          title: trimmedTitle,
          body: trimmedBody,
          mood,
        });
      }

      // Clear draft upon successful save
      await targetRepo.clearDraft(DEFAULT_DRAFT_ID);

      saveStatus = 'saved';
      statusMessage = t('write.draftSaved', activeLang);

      // Reset form state
      title = '';
      body = '';
      mood = 'calm';
      editingId = null;

      props.onSave?.(entry);
      props.onSaved?.(entry);
    } catch (err) {
      console.error('Error saving journal entry:', err);
    } finally {
      isSavingEntry = false;
    }
  }
</script>

<div class="w-full space-y-5">
  <!-- Mood Selector -->
  <fieldset>
    <legend class="block text-xs font-serif uppercase tracking-wider text-white/60 mb-2">
      {activeLang === 'vi' ? 'Tâm trạng lúc này' : 'Current mood'}
    </legend>
    <div class="flex flex-wrap gap-2">
      {#each moodOptions as opt}
        <button
          type="button"
          onclick={() => handleSelectMood(opt.id)}
          class="px-3 py-1.5 rounded-full text-xs font-light transition-all duration-200 border cursor-pointer {mood === opt.id
            ? 'bg-white/20 border-white/40 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'}"
        >
          <span class="mr-1">{opt.icon}</span>
          {opt.label}
        </button>
      {/each}
    </div>
  </fieldset>

  <!-- Title Input -->
  <div>
    <label for="journal-title" class="sr-only">Tiêu đề bài viết / Entry Title</label>
    <input
      id="journal-title"
      type="text"
      placeholder={t('write.titlePlaceholder', activeLang)}
      value={title}
      oninput={handleTitleInput}
      class="w-full px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 focus:border-white/40 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 text-base font-serif transition-colors backdrop-blur-md"
    />
  </div>

  <!-- Body Textarea -->
  <div>
    <label for="journal-body" class="sr-only">Nội dung suy nghĩ / Reflections</label>
    <textarea
      id="journal-body"
      rows="7"
      placeholder={t('write.bodyPlaceholder', activeLang)}
      value={body}
      oninput={handleBodyInput}
      class="w-full px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 focus:border-white/40 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 text-sm font-light leading-relaxed resize-y transition-colors backdrop-blur-md"
    ></textarea>
  </div>

  <!-- Footer Actions & Serene Status Indicator -->
  <div class="flex items-center justify-between pt-2">
    <div class="flex items-center gap-2 text-xs font-light min-h-[24px]">
      {#if statusMessage}
        <span
          class="flex items-center gap-1.5 transition-opacity duration-300 {saveStatus === 'saved'
            ? 'text-emerald-300'
            : 'text-white/60'}"
        >
          {#if saveStatus === 'saved'}
            <MorphIcon
              icon={Check}
              size={14}
              strokeWidth={2}
              spring="smooth"
              reducedMotion="user"
            />
          {:else if saveStatus === 'saving'}
            <span class="inline-block w-2 h-2 rounded-full bg-white/80 animate-pulse"></span>
          {/if}
          {statusMessage}
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if editingId}
        <button
          type="button"
          onclick={handleCancelEdit}
          class="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white font-light text-xs tracking-wide transition-all cursor-pointer"
        >
          {t('write.cancelButton', activeLang)}
        </button>
      {/if}

      <button
        type="button"
        onclick={handleSaveEntry}
        disabled={isSavingEntry || (!title.trim() && !body.trim())}
        class="px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 hover:border-white/40 text-white font-medium text-xs tracking-wide shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        {isSavingEntry ? t('write.saving', activeLang) : editingId ? t('write.updateButton', activeLang) : t('write.saveButton', activeLang)}
      </button>
    </div>
  </div>
</div>
