<script lang="ts">
  import { MorphIcon } from 'morphicons/svelte';
  import {
    Play,
    Pause,
    SkipForward,
    Volume2,
    VolumeX,
    Sparkles,
    Image,
    RefreshCw,
    Pen,
    BookOpen,
    Eye,
    EyeOff,
    Heart,
    Music,
  } from 'lucide';
  import { t } from '../lib/i18n/store';
  import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../lib/i18n/types';

  interface Props {
    isPlaying?: boolean;
    volume?: number;
    trackTitle?: string;
    trackArtist?: string;
    visualMode?: 'shader' | 'static';
    artworkTitle?: string;
    artworkArtist?: string;
    activeModal?: 'write' | 'list' | 'feedback' | 'music' | null;
    isZenMode?: boolean;
    weatherLabel?: string;
    selectionReason?: string;
    audioReason?: string;
    soundCategory?: 'all' | 'piano' | 'ambient';
    lang?: SupportedLanguage;
    onTogglePlay?: () => void;
    onVolumeChange?: (volume: number) => void;
    onNextTrack?: () => void;
    onPreviousTrack?: () => void;
    onToggleVisualMode?: () => void;
    onNextArtwork?: () => void;
    onOpenJournalWrite?: () => void;
    onOpenJournalList?: () => void;
    onOpenFeedback?: () => void;
    onOpenMusicLibrary?: () => void;
    onToggleZenMode?: () => void;
    onToggleSoundCategory?: () => void;
  }

  let props: Props = $props();

  let activeLang = $derived(props.lang || DEFAULT_LANGUAGE);
  let lastNonZeroVolume = $state(0.4);

  function handleVolumeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    if (!Number.isNaN(val)) {
      if (val > 0.01) {
        lastNonZeroVolume = val;
      }
      props.onVolumeChange?.(val);
    }
  }

  function handleToggleMute() {
    const currentVol = props.volume ?? 0.4;
    if (currentVol > 0.01) {
      lastNonZeroVolume = currentVol;
      props.onVolumeChange?.(0);
    } else {
      const restored = lastNonZeroVolume > 0.05 ? lastNonZeroVolume : 0.4;
      props.onVolumeChange?.(restored);
    }
  }
</script>

<nav
  class="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-5xl w-[95%] sm:w-auto transition-all duration-700 ease-out {props.isZenMode ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}"
  aria-label="Haven Art Controls / Bảng điều khiển Haven Art"
>
  <!-- Floating Ultra-Transparent Crystal Glass Island -->
  <div
    class="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2.5 transition-all duration-300"
  >
    <!-- 1. Audio Playback Section -->
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- Play/Pause Button with MorphIcon Spring Physics -->
      <button
        type="button"
        onclick={props.onTogglePlay}
        class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer {props.isPlaying ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.25)] scale-105' : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/25'}"
        aria-label={props.isPlaying ? `${t('dock.pause', activeLang)} / Tạm dừng nhạc` : `${t('dock.play', activeLang)} / Phát nhạc`}
      >
        <MorphIcon
          icon={props.isPlaying ? Pause : Play}
          size={16}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
          class={props.isPlaying ? '' : 'translate-x-0.5'}
        />
      </button>

      <!-- Next Track Button with MorphIcon -->
      {#if props.onNextTrack}
        <button
          type="button"
          onclick={props.onNextTrack}
          class="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
          aria-label="{t('dock.nextTrack', activeLang)} / Bài nhạc tiếp theo"
          title="{t('dock.nextTrack', activeLang)}"
        >
          <MorphIcon
            icon={SkipForward}
            size={14}
            strokeWidth={2}
            spring="smooth"
            reducedMotion="user"
          />
        </button>
      {/if}

      <!-- Open Music & Piano Library Button -->
      {#if props.onOpenMusicLibrary}
        <button
          type="button"
          onclick={props.onOpenMusicLibrary}
          class="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {props.activeModal === 'music' ? 'bg-white/20 text-white' : ''}"
          aria-label="{t('dock.musicLibrary', activeLang)} / Thư viện âm nhạc & Piano"
          title="{t('dock.musicLibrary', activeLang)}"
        >
          <MorphIcon
            icon={Music}
            size={14}
            strokeWidth={2}
            spring="smooth"
            reducedMotion="user"
          />
        </button>
      {/if}

      <!-- Sound Category Toggle (All / Piano / Ambient) -->
      {#if props.onToggleSoundCategory}
        <button
          type="button"
          onclick={props.onToggleSoundCategory}
          class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-light text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          title="{t('dock.toggleSoundCategory', activeLang)}"
          aria-label="{t('dock.toggleSoundCategory', activeLang)}: {props.soundCategory === 'piano' ? t('dock.soundCategoryPiano', activeLang) : props.soundCategory === 'ambient' ? t('dock.soundCategoryAmbient', activeLang) : t('dock.soundCategoryAll', activeLang)}"
        >
          <span>
            {#if props.soundCategory === 'piano'}
              🎹 {t('dock.soundCategoryPiano', activeLang)}
            {:else if props.soundCategory === 'ambient'}
              🍃 {t('dock.soundCategoryAmbient', activeLang)}
            {:else}
              🎵 {t('dock.soundCategoryAll', activeLang)}
            {/if}
          </span>
        </button>
      {/if}

      <!-- Track Title & Artwork Poetic Caption (Clickable to open playlist) -->
      {#if props.trackTitle || props.artworkTitle}
        <button
          type="button"
          onclick={props.onOpenMusicLibrary}
          class="hidden md:flex flex-col text-left leading-tight pl-1 pr-1 max-w-[130px] lg:max-w-[180px] rounded hover:bg-white/5 transition-colors cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          title="{props.audioReason ? `${props.trackTitle} • ${props.audioReason}` : props.trackTitle} • {t('dock.musicLibrary', activeLang)}"
          aria-label="{t('dock.musicLibrary', activeLang)}: {props.trackTitle}"
        >
          {#if props.trackTitle}
            <span class="text-xs text-white/95 font-light truncate drop-shadow-sm group-hover:text-amber-200 transition-colors">
              {props.trackTitle}
            </span>
          {/if}
          {#if props.artworkTitle}
            <span class="text-[10px] text-white/60 font-serif italic truncate drop-shadow-sm">
              {props.artworkTitle}
            </span>
          {/if}
        </button>
      {/if}

      <!-- Volume Slider with MorphIcon Mute/Unmute Button -->
      <div class="flex items-center gap-1 sm:gap-1.5 ml-0.5">
        <button
          type="button"
          onclick={handleToggleMute}
          class="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          aria-label={(props.volume ?? 0.4) <= 0.01 ? 'Bật tiếng / Unmute' : 'Tắt tiếng / Mute'}
          title={(props.volume ?? 0.4) <= 0.01 ? 'Bật tiếng' : 'Tắt tiếng'}
        >
          <MorphIcon
            icon={(props.volume ?? 0.4) <= 0.01 ? VolumeX : Volume2}
            size={14}
            strokeWidth={2}
            spring="smooth"
            reducedMotion="user"
          />
        </button>
        <input
          id="haven-dock-volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={props.volume ?? 0.4}
          oninput={handleVolumeInput}
          aria-label="{t('dock.volume', activeLang)} / Điều chỉnh âm lượng"
          class="w-12 sm:w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        />
      </div>
    </div>

    <!-- Transparent Divider -->
    <div class="w-px h-4 bg-white/20 hidden sm:block" aria-hidden="true"></div>

    <!-- 2. Visual / Artwork Presentation Section -->
    <div class="flex items-center gap-1 sm:gap-1.5">
      <!-- Visual Switch Button with MorphIcon -->
      <button
        type="button"
        onclick={props.onToggleVisualMode}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-light text-white/80 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
        aria-label="{t('dock.toggleVisualMode', activeLang)} - Chế độ hình nền ({props.visualMode === 'shader' ? 'Shader' : 'Tranh tĩnh'})"
        title="{t('dock.toggleVisualMode', activeLang)}"
      >
        <MorphIcon
          icon={props.visualMode === 'shader' ? Sparkles : Image}
          size={13}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
          class={props.visualMode === 'shader' ? 'text-emerald-400' : 'text-amber-300'}
        />
        <span>{props.visualMode === 'shader' ? 'Shader' : activeLang === 'vi' ? 'Tranh tĩnh' : 'Canvas'}</span>
      </button>

      <!-- Next Artwork Mini Button with MorphIcon -->
      {#if props.onNextArtwork}
        <button
          type="button"
          onclick={props.onNextArtwork}
          class="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
          aria-label="{t('dock.nextArtwork', activeLang)} / Đổi tranh tiếp theo"
          title="{t('dock.nextArtwork', activeLang)}"
        >
          <MorphIcon
            icon={RefreshCw}
            size={13}
            strokeWidth={2}
            spring="smooth"
            reducedMotion="user"
          />
        </button>
      {/if}
    </div>

    <!-- Transparent Divider -->
    <div class="w-px h-4 bg-white/20" aria-hidden="true"></div>

    <!-- 3. Action Buttons & Zen Mode -->
    <div class="flex items-center gap-1 sm:gap-1.5">
      <!-- Viết nhật ký with MorphIcon -->
      <button
        type="button"
        onclick={props.onOpenJournalWrite}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-light tracking-wide text-white/85 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {props.activeModal === 'write' ? 'bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : ''}"
        aria-label="{t('dock.writeJournal', activeLang)} - Viết nhật ký"
        title="{t('dock.writeJournal', activeLang)}"
      >
        <MorphIcon
          icon={Pen}
          size={13}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
        />
        <span class="hidden sm:inline">{t('dock.writeJournal', activeLang)}</span>
      </button>

      <!-- Danh sách bài viết with MorphIcon -->
      <button
        type="button"
        onclick={props.onOpenJournalList}
        class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-light text-white/85 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {props.activeModal === 'list' ? 'bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : ''}"
        aria-label="{t('dock.journalList', activeLang)} - Danh sách bài viết"
        title="{t('dock.journalList', activeLang)}"
      >
        <MorphIcon
          icon={BookOpen}
          size={13}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
        />
        <span class="hidden sm:inline">{t('dock.journalList', activeLang)}</span>
      </button>

      <!-- Feedback / Cảm nhận Button with MorphIcon -->
      {#if props.onOpenFeedback}
        <button
          type="button"
          onclick={props.onOpenFeedback}
          class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-light text-white/85 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {props.activeModal === 'feedback' ? 'bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : ''}"
          aria-label="{activeLang === 'vi' ? 'Gửi cảm nhận & Đánh giá' : 'Send Feedback'}"
          title="{activeLang === 'vi' ? 'Gửi cảm nhận & Đánh giá' : 'Send Feedback'}"
        >
          <MorphIcon
            icon={Heart}
            size={13}
            strokeWidth={2}
            spring="smooth"
            reducedMotion="user"
            class={props.activeModal === 'feedback' ? 'text-rose-300 fill-rose-300/40' : 'text-rose-300/80'}
          />
          <span class="hidden lg:inline">{activeLang === 'vi' ? 'Cảm nhận' : 'Feedback'}</span>
        </button>
      {/if}

      <!-- Zen Immersion Toggle Button with MorphIcon -->
      <button
        type="button"
        onclick={props.onToggleZenMode}
        class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {props.isZenMode ? 'bg-amber-400/30 text-amber-200 border border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white'}"
        aria-label="{props.isZenMode ? t('dock.exitZenMode', activeLang) : t('dock.zenMode', activeLang)} - Chế độ tĩnh tâm"
        title="{props.isZenMode ? t('dock.exitZenMode', activeLang) : t('dock.zenMode', activeLang)}"
      >
        <MorphIcon
          icon={props.isZenMode ? EyeOff : Eye}
          size={14}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
          class={props.isZenMode ? 'text-amber-300' : 'text-white/80'}
        />
      </button>
    </div>
  </div>
</nav>
