<script lang="ts">
  import { MorphIcon } from 'morphicons/svelte';
  import { X, Play, Pause, Music, Search, Volume2, Sparkles } from 'lucide';
  import { ALL_HAVEN_AUDIO_TRACKS, type HavenAudioTrack } from '../lib/audio/ambient-catalog';
  import { t } from '../lib/i18n/store';
  import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../lib/i18n/types';

  interface Props {
    currentTrackId?: string;
    isPlaying?: boolean;
    lang?: SupportedLanguage;
    onSelectTrack: (track: HavenAudioTrack) => void;
    onClose: () => void;
  }

  let props: Props = $props();

  let activeLang = $derived(props.lang || DEFAULT_LANGUAGE);
  let searchQuery = $state('');
  let selectedCategory = $state<'all' | 'piano' | 'ambient'>('all');

  function formatDuration(sec: number): string {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  }

  let filteredTracks = $derived.by(() => {
    let tracks = ALL_HAVEN_AUDIO_TRACKS;

    if (selectedCategory !== 'all') {
      tracks = tracks.filter((t) => t.category === selectedCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return tracks;

    return tracks.filter((t) => {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchArtist = t.artist.toLowerCase().includes(q);
      const matchGenre = t.genreVi.toLowerCase().includes(q);
      const matchMoods = t.moods.some((m) => m.toLowerCase().includes(q));
      return matchTitle || matchArtist || matchGenre || matchMoods;
    });
  });

  let pianoCount = $derived(ALL_HAVEN_AUDIO_TRACKS.filter((t) => t.category === 'piano').length);
  let ambientCount = $derived(ALL_HAVEN_AUDIO_TRACKS.filter((t) => t.category === 'ambient').length);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      props.onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Fullscreen Backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in"
  role="dialog"
  aria-modal="true"
  aria-labelledby="music-library-title"
>
  <!-- Modal Window -->
  <div
    class="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900/85 text-stone-100 border border-white/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden animate-scale-up"
  >
    <!-- Modal Header -->
    <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
          <MorphIcon icon={Music} size={18} strokeWidth={2} />
        </div>
        <div>
          <h2 id="music-library-title" class="text-base sm:text-lg font-serif font-medium text-white tracking-wide">
            {t('dock.musicLibrary', activeLang)}
          </h2>
          <p class="text-xs text-stone-400">
            {ALL_HAVEN_AUDIO_TRACKS.length} bản nhạc thanh tịnh • {pianoCount} Độc tấu Piano • {ambientCount} Âm thanh tự nhiên
          </p>
        </div>
      </div>

      <button
        type="button"
        onclick={props.onClose}
        class="w-8 h-8 rounded-full text-stone-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        aria-label="Đóng thư viện âm nhạc"
        title="Đóng"
      >
        <MorphIcon icon={X} size={16} strokeWidth={2} />
      </button>
    </div>

    <!-- Search & Category Filters -->
    <div class="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-3 bg-white/[0.02]">
      <!-- Search Input -->
      <div class="relative flex-1">
        <MorphIcon icon={Search} size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Tìm theo tên bài hát, nghệ sĩ (Yiruma, Beethoven, Chopin...)..."
          class="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white/5 border border-white/15 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => (searchQuery = '')}
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        {/if}
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onclick={() => (selectedCategory = 'all')}
          class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer {selectedCategory === 'all' ? 'bg-white/20 text-white border border-white/30 font-medium' : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'}"
        >
          Tất cả ({ALL_HAVEN_AUDIO_TRACKS.length})
        </button>
        <button
          type="button"
          onclick={() => (selectedCategory = 'piano')}
          class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer {selectedCategory === 'piano' ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40 font-medium' : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'}"
        >
          🎹 Piano ({pianoCount})
        </button>
        <button
          type="button"
          onclick={() => (selectedCategory = 'ambient')}
          class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer {selectedCategory === 'ambient' ? 'bg-emerald-400/25 text-emerald-200 border border-emerald-400/40 font-medium' : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'}"
        >
          🍃 Ambient ({ambientCount})
        </button>
      </div>
    </div>

    <!-- Track List Body -->
    <div class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 divide-y divide-white/[0.04]">
      {#if filteredTracks.length === 0}
        <div class="py-12 text-center text-stone-400">
          <p class="text-sm">Không tìm thấy bản nhạc nào phù hợp với từ khóa.</p>
        </div>
      {:else}
        {#each filteredTracks as track, index (track.id)}
          {@const isCurrent = track.id === props.currentTrackId}
          <div
            role="button"
            tabindex="0"
            onclick={() => props.onSelectTrack(track)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onSelectTrack(track); } }}
            class="group w-full text-left p-2.5 sm:p-3 rounded-xl transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer {isCurrent ? 'bg-amber-400/15 border border-amber-400/35 shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'hover:bg-white/5 border border-transparent'}"
          >
            <!-- Track Info Left -->
            <div class="flex items-center gap-3 min-w-0">
              <!-- Play / Status Icon -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all {isCurrent ? 'bg-amber-400 text-slate-900 shadow-sm' : 'bg-white/10 text-stone-300 group-hover:bg-white/20 group-hover:text-white'}"
              >
                {#if isCurrent && props.isPlaying}
                  <span class="flex items-center gap-0.5">
                    <span class="w-0.5 h-3 bg-slate-900 rounded-full animate-pulse"></span>
                    <span class="w-0.5 h-4 bg-slate-900 rounded-full animate-pulse [animation-delay:150ms]"></span>
                    <span class="w-0.5 h-2 bg-slate-900 rounded-full animate-pulse [animation-delay:300ms]"></span>
                  </span>
                {:else}
                  <MorphIcon icon={Play} size={14} class="translate-x-0.5" />
                {/if}
              </div>

              <!-- Title & Meta -->
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-xs sm:text-sm font-medium text-white truncate {isCurrent ? 'text-amber-200 font-semibold' : ''}">
                    {track.title}
                  </h3>
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-light {track.category === 'piano' ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25' : 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/25'}"
                  >
                    {track.category === 'piano' ? '🎹 Piano' : '🍃 Ambient'}
                  </span>
                </div>
                <p class="text-[11px] text-stone-400 truncate">
                  {track.artist} • <span class="italic text-stone-500">{track.genreVi}</span>
                </p>
              </div>
            </div>

            <!-- Track Info Right (Duration & Status) -->
            <div class="flex items-center gap-2 shrink-0 text-right">
              {#if isCurrent}
                <span class="hidden sm:inline-block text-[11px] text-amber-300 font-medium px-2 py-0.5 bg-amber-400/10 rounded-full border border-amber-400/20">
                  {props.isPlaying ? 'Đang phát' : 'Đã chọn'}
                </span>
              {/if}
              <span class="text-xs text-stone-400 font-mono">
                {formatDuration(track.durationSeconds)}
              </span>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Modal Footer -->
    <div class="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-400 bg-white/[0.02]">
      <div class="flex items-center gap-1.5">
        <MorphIcon icon={Sparkles} size={14} class="text-amber-300" />
        <span>Giai điệu tự động điều chỉnh mượt mà theo cảm xúc và thời tiết</span>
      </div>
      <button
        type="button"
        onclick={props.onClose}
        class="px-3 py-1 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer"
      >
        {t('journal.close', activeLang)}
      </button>
    </div>
  </div>
</div>
