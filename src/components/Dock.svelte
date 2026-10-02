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
  } from 'lucide';

  interface Props {
    isPlaying?: boolean;
    volume?: number;
    trackTitle?: string;
    trackArtist?: string;
    visualMode?: 'shader' | 'static';
    artworkTitle?: string;
    artworkArtist?: string;
    activeModal?: 'write' | 'list' | null;
    isZenMode?: boolean;
    weatherLabel?: string;
    selectionReason?: string;
    audioReason?: string;
    soundCategory?: 'all' | 'piano' | 'ambient';
    onTogglePlay?: () => void;
    onVolumeChange?: (volume: number) => void;
    onNextTrack?: () => void;
    onPreviousTrack?: () => void;
    onToggleVisualMode?: () => void;
    onNextArtwork?: () => void;
    onOpenJournalWrite?: () => void;
    onOpenJournalList?: () => void;
    onToggleZenMode?: () => void;
    onToggleSoundCategory?: () => void;
  }

  let {
    isPlaying = false,
    volume = 0.4,
    trackTitle = '',
    trackArtist = '',
    visualMode = 'static',
    artworkTitle = '',
    artworkArtist = '',
    activeModal = null,
    isZenMode = false,
    weatherLabel = '',
    selectionReason = '',
    audioReason = '',
    soundCategory = 'all',
    onTogglePlay,
    onVolumeChange,
    onNextTrack,
    onPreviousTrack,
    onToggleVisualMode,
    onNextArtwork,
    onOpenJournalWrite,
    onOpenJournalList,
    onToggleZenMode,
    onToggleSoundCategory,
  }: Props = $props();

  function handleVolumeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    if (!Number.isNaN(val)) {
      onVolumeChange?.(val);
    }
  }
</script>

<nav
  class="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-5xl w-[95%] sm:w-auto transition-all duration-700 ease-out {isZenMode ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}"
  aria-label="Bảng điều khiển Haven Art"
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
        onclick={onTogglePlay}
        class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer {isPlaying ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.25)] scale-105' : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/25'}"
        aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}
      >
        <MorphIcon
          icon={isPlaying ? Pause : Play}
          size={16}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
          class={isPlaying ? '' : 'translate-x-0.5'}
        />
      </button>

      <!-- Next Track Button with MorphIcon -->
      {#if onNextTrack}
        <button
          type="button"
          onclick={onNextTrack}
          class="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
          aria-label="Bài nhạc tiếp theo"
          title="Chuyển bài thiền định tiếp theo"
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

      <!-- Sound Category Toggle (All / Piano / Ambient) -->
      {#if onToggleSoundCategory}
        <button
          type="button"
          onclick={onToggleSoundCategory}
          class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-light text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          title="Chuyển thể loại âm nhạc: Đa dạng / Độc tấu Piano / Âm thanh tự nhiên"
          aria-label="Chuyển thể loại âm nhạc: {soundCategory === 'piano' ? 'Độc tấu Piano' : soundCategory === 'ambient' ? 'Ambient tự nhiên' : 'Đa dạng'}"
        >
          <span>{soundCategory === 'piano' ? '🎹 Piano' : soundCategory === 'ambient' ? '🍃 Ambient' : '🎵 Đa dạng'}</span>
        </button>
      {/if}

      <!-- Track Title & Artwork Poetic Caption -->
      {#if trackTitle || artworkTitle}
        <div class="hidden md:flex flex-col text-left leading-tight pl-1 pr-1 max-w-[130px] lg:max-w-[180px]">
          {#if trackTitle}
            <span class="text-xs text-white/95 font-light truncate drop-shadow-sm" title={audioReason ? `${trackTitle} • ${audioReason}` : trackTitle}>
              {trackTitle}
            </span>
          {/if}
          {#if artworkTitle}
            <span class="text-[10px] text-white/60 font-serif italic truncate drop-shadow-sm" title="{artworkTitle} - {artworkArtist}">
              {artworkTitle}
            </span>
          {/if}
        </div>
      {/if}

      <!-- Volume Slider with MorphIcon -->
      <div class="flex items-center gap-1.5 ml-0.5">
        <label for="haven-dock-volume" class="text-white/60 hover:text-white flex items-center cursor-pointer">
          <MorphIcon
            icon={volume <= 0.01 ? VolumeX : Volume2}
            size={14}
            strokeWidth={2}
            spring="smooth"
            reducedMotion="user"
          />
        </label>
        <input
          id="haven-dock-volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          oninput={handleVolumeInput}
          aria-label="Điều chỉnh âm lượng"
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
        onclick={onToggleVisualMode}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-light text-white/80 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
        aria-label="Chuyển chế độ hình nền: {visualMode === 'shader' ? 'Đổi sang ảnh tĩnh' : 'Đổi sang shader động'}"
        title="Chuyển giữa kiệt tác tranh tĩnh và shader dòng chảy"
      >
        <MorphIcon
          icon={visualMode === 'shader' ? Sparkles : Image}
          size={13}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
          class={visualMode === 'shader' ? 'text-emerald-400' : 'text-amber-300'}
        />
        <span>{visualMode === 'shader' ? 'Shader' : 'Tranh tĩnh'}</span>
      </button>

      <!-- Next Artwork Mini Button with MorphIcon -->
      {#if onNextArtwork}
        <button
          type="button"
          onclick={onNextArtwork}
          class="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
          aria-label="Đổi tranh tiếp theo"
          title="Xem tác phẩm tiếp theo trong phòng tranh"
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
        onclick={onOpenJournalWrite}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-light tracking-wide text-white/85 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {activeModal === 'write' ? 'bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : ''}"
        aria-label="Viết nhật ký"
        title="Mở bảng ghi lại suy ngẫm an yên"
      >
        <MorphIcon
          icon={Pen}
          size={13}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
        />
        <span class="hidden sm:inline">Viết nhật ký</span>
      </button>

      <!-- Danh sách bài viết with MorphIcon -->
      <button
        type="button"
        onclick={onOpenJournalList}
        class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-light text-white/85 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {activeModal === 'list' ? 'bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : ''}"
        aria-label="Danh sách bài viết"
        title="Xem lại các trang nhật ký đã lưu"
      >
        <MorphIcon
          icon={BookOpen}
          size={13}
          strokeWidth={2}
          spring="smooth"
          reducedMotion="user"
        />
        <span class="hidden md:inline">Nhật ký</span>
      </button>

      <!-- Zen / Immersion Mode Button with MorphIcon -->
      {#if onToggleZenMode}
        <button
          type="button"
          onclick={onToggleZenMode}
          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer ml-0.5"
          aria-label="Ẩn bảng điều khiển để tận hưởng tranh toàn màn hình"
          title="Chế độ tĩnh lặng: Ẩn bảng điều khiển để ngắm trọn vẹn bức tranh"
        >
          <MorphIcon
            icon={isZenMode ? EyeOff : Eye}
            size={14}
            strokeWidth={2}
            spring="smooth"
            reducedMotion="user"
          />
        </button>
      {/if}
    </div>
  </div>
</nav>

<!-- Floating 'Show Dock' Indicator when Zen Mode is active -->
{#if isZenMode}
  <button
    type="button"
    onclick={onToggleZenMode}
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-black/25 hover:bg-black/40 text-white/70 hover:text-white border border-white/15 backdrop-blur-md text-xs font-light tracking-wide shadow-lg transition-all duration-300 cursor-pointer animate-fade-in"
    aria-label="Hiện lại bảng điều khiển"
  >
    <span>✦ Hiện bảng điều khiển</span>
  </button>
{/if}
