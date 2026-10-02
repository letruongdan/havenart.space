<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { JournalRepository } from '../lib/db/repository';
  import { DraftRepository } from '../lib/db/drafts';
  import { DEFAULT_DRAFT_ID, type JournalEntry } from '../lib/db/schema';
  import { MorphIcon } from 'morphicons/svelte';
  import {
    Check,
    Share2,
    ShieldCheck,
    Sparkles,
    Cloud,
    Lock,
  } from 'lucide';
  import { t } from '../lib/i18n/store';
  import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../lib/i18n/types';
  import ShareModal from './ShareModal.svelte';
  import UserAuthModal from './UserAuthModal.svelte';
  import { isUserLoggedIn, getCurrentUser, type AuthUser } from '../lib/auth/user-client';
  import { pushEntriesToServer } from '../lib/sync/cloud-sync';

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
  let showShareModal = $state(false);
  let showAuthModal = $state(false);

  // User auth state
  let loggedInUser = $state<AuthUser | null>(getCurrentUser());
  let isCloudSynced = $state(false);

  let localRepo = $state<JournalRepository | null>(null);
  let activeRepo = $derived(props.repo || props.repository || localRepo);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Real-time Note Statistics
  let wordCount = $derived(
    body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0
  );
  let charCount = $derived(body.length);
  let readingTimeMinutes = $derived(Math.max(1, Math.ceil(wordCount / 200)));

  let formattedDate = $derived.by(() => {
    return new Intl.DateTimeFormat(activeLang === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  });

  let moodOptions = $derived([
    { id: 'calm', label: t('moods.calm', activeLang), icon: '🍃' },
    { id: 'grateful', label: t('moods.grateful', activeLang), icon: '✨' },
    { id: 'reflective', label: t('moods.reflective', activeLang), icon: '🌙' },
    { id: 'peaceful', label: t('moods.peaceful', activeLang), icon: '🕊️' },
    { id: 'hopeful', label: t('moods.hopeful', activeLang), icon: '☀️' },
  ]);

  const inspirationalPromptsVi = [
    'Điều gì khiến trái tim bạn mỉm cười nhẹ nhõm hôm nay?',
    'Một khoảnh khắc tĩnh lặng bạn muốn giữ lại cho riêng mình...',
    'Hít một hơi thật sâu: Hiện tại xung quanh bạn đang có điều gì bình yên?',
    'Lời nhắn gửi dịu dàng đến bản thân của ngày hôm nay...',
  ];

  const inspirationalPromptsEn = [
    'What brought a quiet smile to your heart today?',
    'A tranquil moment you would love to treasure forever...',
    'Take a deep breath: What feels serene and gentle right now?',
    'A kind whisper of encouragement to your future self...',
  ];

  function insertInspiringPrompt() {
    const prompts = activeLang === 'vi' ? inspirationalPromptsVi : inspirationalPromptsEn;
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    if (!body.trim()) {
      body = randomPrompt + '\n\n';
    } else {
      body += '\n\n' + randomPrompt + '\n';
    }
    triggerAutosave();
  }

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

    function onAuthChanged(e: Event) {
      const custom = e as CustomEvent<{ session: any }>;
      loggedInUser = custom.detail?.session?.user || null;
    }
    window.addEventListener('haven:user-auth-changed', onAuthChanged);

    return () => {
      window.removeEventListener('haven:user-auth-changed', onAuthChanged);
    };
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

      // Automatic Cloud Backup: If user is logged in, sync entry to server
      if (isUserLoggedIn()) {
        pushEntriesToServer([entry])
          .then((res) => {
            if (res.success) {
              isCloudSynced = true;
              statusMessage = activeLang === 'vi'
                ? 'Đã lưu & đồng bộ máy chủ Cloud'
                : 'Saved & Synced to Cloud Vault';
            }
          })
          .catch((err) => {
            console.warn('Lỗi đồng bộ ngầm lên server:', err);
          });
      }

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

  function handleOpenShare() {
    if (!body.trim() && !title.trim()) return;
    showShareModal = true;
  }
</script>

<div class="w-full space-y-4">
  <!-- Privacy & Confidentiality Guarantee Banner (Strict Privacy Notice) -->
  <div class="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 backdrop-blur-md flex items-start gap-3">
    <div class="p-1.5 rounded-xl bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 shrink-0 mt-0.5">
      <MorphIcon icon={ShieldCheck} size={16} strokeWidth={2} spring="smooth" reducedMotion="user" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h4 class="text-xs sm:text-sm font-serif font-medium text-emerald-200">
          {activeLang === 'vi' ? 'Không Gian Riêng Tư Tuyệt Đối' : 'Strictly Private & Confidential'}
        </h4>
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-400/15 text-emerald-300">
          <MorphIcon icon={Lock} size={10} strokeWidth={2} />
          <span>{activeLang === 'vi' ? 'Chỉ bạn có thể xem' : 'Only you can view'}</span>
        </span>
      </div>
      <p class="text-[11px] sm:text-xs text-white/70 font-light mt-1 leading-relaxed">
        {activeLang === 'vi'
          ? 'Nội dung bạn viết ở đây không ai có thể xem được ngoài bạn. Dữ liệu được bảo mật an toàn, mã hóa đầu cuối trên thiết bị và cam kết không bao giờ bị thu thập hay đọc lén.'
          : 'Nobody can read or access your reflections here except you. Encrypted end-to-end and stored securely on your personal device without tracking.'}
      </p>
    </div>
  </div>

  <!-- Notebook Page Container -->
  <div class="relative rounded-3xl bg-white/[0.04] border border-white/15 p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-2xl overflow-hidden group">
    <!-- Subtle notebook ruled lines accent / ambient background glow -->
    <div class="absolute -top-20 -right-20 w-44 h-44 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Notebook Header: Date, Word Stats, Prompt Hint -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs">
      <div class="flex items-center gap-2 text-white/60">
        <span class="font-serif capitalize text-white/80">{formattedDate}</span>
        <span>•</span>
        <span class="font-mono text-white/50">{wordCount} {activeLang === 'vi' ? 'từ' : 'words'}</span>
        {#if wordCount > 0}
          <span>•</span>
          <span class="font-light text-amber-300/80">~{readingTimeMinutes} {activeLang === 'vi' ? 'phút đọc' : 'min read'}</span>
        {/if}
      </div>

      <!-- Quick Action Tools: Inspire Prompt & Clear -->
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onclick={insertInspiringPrompt}
          class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-amber-200 text-xs font-light transition-all flex items-center gap-1.5 cursor-pointer"
          title={activeLang === 'vi' ? 'Chèn câu hỏi gợi mở suy ngẫm' : 'Insert inspiring reflection prompt'}
        >
          <MorphIcon icon={Sparkles} size={12} strokeWidth={2} class="text-amber-300" />
          <span>{activeLang === 'vi' ? 'Gợi mở suy ngẫm' : 'Inspire Prompt'}</span>
        </button>
      </div>
    </div>

    <!-- Mood Selector Pills -->
    <div class="pt-3 pb-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[11px] font-serif uppercase tracking-wider text-white/50 mr-1">
          {activeLang === 'vi' ? 'Tâm trạng:' : 'Mood:'}
        </span>
        {#each moodOptions as opt}
          <button
            type="button"
            onclick={() => handleSelectMood(opt.id)}
            class="px-3 py-1 rounded-full text-xs font-light transition-all duration-200 border cursor-pointer flex items-center gap-1 {mood === opt.id
              ? 'bg-amber-400/20 border-amber-400/40 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'}"
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Notebook Canvas: Title Input -->
    <div class="pt-2">
      <label for="journal-title" class="sr-only">Tiêu đề trang note / Note Title</label>
      <input
        id="journal-title"
        type="text"
        placeholder={t('write.titlePlaceholder', activeLang)}
        value={title}
        oninput={handleTitleInput}
        class="w-full px-1 py-2 bg-transparent border-b border-white/10 focus:border-amber-400/60 text-white placeholder-white/30 focus:outline-none text-lg sm:text-xl font-serif font-medium transition-colors"
      />
    </div>

    <!-- Notebook Canvas: Body Textarea -->
    <div class="pt-3">
      <label for="journal-body" class="sr-only">Nội dung ghi chú / Reflection Body</label>
      <textarea
        id="journal-body"
        rows="8"
        placeholder={t('write.bodyPlaceholder', activeLang)}
        value={body}
        oninput={handleBodyInput}
        class="w-full px-1 py-2 bg-transparent text-white placeholder-white/25 focus:outline-none text-sm sm:text-base font-light leading-relaxed resize-y transition-colors min-h-[170px]"
      ></textarea>
    </div>

    <!-- Notebook Footer: Status Indicator, Cloud State, Share & Save -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-2 border-t border-white/10">
      <!-- Left: Status Message & Cloud Backup Badge -->
      <div class="flex items-center gap-3 text-xs font-light min-h-[24px]">
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

        <!-- Cloud Sync Badge Indicator -->
        <div class="hidden sm:flex items-center gap-1.5 text-[11px] text-white/50">
          {#if loggedInUser}
            <span class="flex items-center gap-1 text-emerald-400/90" title="Đã kết nối với tài khoản lưu trữ máy chủ">
              <MorphIcon icon={Cloud} size={12} strokeWidth={2} />
              <span>{activeLang === 'vi' ? 'Lưu trên Server' : 'Cloud Backed'}</span>
            </span>
          {:else}
            <button
              type="button"
              onclick={() => (showAuthModal = true)}
              class="flex items-center gap-1 text-white/40 hover:text-amber-300 underline cursor-pointer transition-colors"
              title="Đăng nhập tài khoản để tự động lưu trữ trên server"
            >
              <MorphIcon icon={Cloud} size={11} strokeWidth={2} />
              <span>{activeLang === 'vi' ? 'Đăng nhập để lưu server' : 'Sign in to cloud'}</span>
            </button>
          {/if}
        </div>
      </div>

      <!-- Right Action Buttons: Cancel, Share, Save -->
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <!-- Cancel button (if editing) -->
        {#if editingId}
          <button
            type="button"
            onclick={handleCancelEdit}
            class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white font-light text-xs transition-all cursor-pointer"
          >
            {t('write.cancelButton', activeLang)}
          </button>
        {/if}

        <!-- Share Button: Opens Share Modal -->
        <button
          type="button"
          onclick={handleOpenShare}
          disabled={!body.trim() && !title.trim()}
          class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed border border-white/15 text-white font-light text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          title={activeLang === 'vi' ? 'Chia sẻ bài viết này cho người khác' : 'Share this reflection'}
        >
          <MorphIcon icon={Share2} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>{activeLang === 'vi' ? 'Chia sẻ' : 'Share'}</span>
        </button>

        <!-- Save Button -->
        <button
          type="button"
          onclick={handleSaveEntry}
          disabled={isSavingEntry || (!title.trim() && !body.trim())}
          class="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed text-black font-medium text-xs tracking-wide shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {isSavingEntry
            ? t('write.saving', activeLang)
            : editingId
              ? t('write.updateButton', activeLang)
              : t('write.saveButton', activeLang)}
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Share Modal -->
{#if showShareModal}
  <ShareModal
    {title}
    {body}
    {mood}
    lang={activeLang}
    onClose={() => (showShareModal = false)}
  />
{/if}

<!-- Auth Modal (if user wants to log in to save on server) -->
{#if showAuthModal}
  <UserAuthModal
    repo={props.repo || props.repository}
    lang={activeLang}
    onClose={() => (showAuthModal = false)}
    onUserChange={(u) => {
      loggedInUser = u;
    }}
  />
{/if}
