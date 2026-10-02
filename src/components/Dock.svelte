<script lang="ts">
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
      <!-- Play/Pause Button with Subtle Crystal Glass -->
      <button
        type="button"
        onclick={onTogglePlay}
        class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer {isPlaying ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.25)] scale-105' : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/25'}"
        aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}
      >
        {#if isPlaying}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true">
            <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0v-12a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0v-12a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 ml-0.5" aria-hidden="true">
            <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
          </svg>
        {/if}
      </button>

      <!-- Next Track Button -->
      {#if onNextTrack}
        <button
          type="button"
          onclick={onNextTrack}
          class="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
          aria-label="Bài nhạc tiếp theo"
          title="Chuyển bài thiền định tiếp theo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
            <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.622c0 1.44 1.555 2.343 2.805 1.628L12 14.471v4.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 9.06C13.555 8.347 12 9.25 12 10.69v4.34L5.055 7.06Z" />
          </svg>
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

      <!-- Volume Slider -->
      <div class="flex items-center gap-1.5 ml-0.5">
        <label for="haven-dock-volume" class="text-white/60 hover:text-white flex items-center cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A2.25 2.25 0 0 0 2.25 9.75v4.5A2.25 2.25 0 0 0 4.5 16.5h1.94l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
          </svg>
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
      <!-- Visual Switch Button -->
      <button
        type="button"
        onclick={onToggleVisualMode}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-light text-white/80 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
        aria-label="Chuyển chế độ hình nền: {visualMode === 'shader' ? 'Đổi sang ảnh tĩnh' : 'Đổi sang shader động'}"
        title="Chuyển giữa kiệt tác tranh tĩnh và shader dòng chảy"
      >
        {#if visualMode === 'shader'}
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
          <span>Shader</span>
        {:else}
          <span class="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fbbf24]"></span>
          <span>Tranh tĩnh</span>
        {/if}
      </button>

      <!-- Next Artwork Mini Button -->
      {#if onNextArtwork}
        <button
          type="button"
          onclick={onNextArtwork}
          class="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer"
          aria-label="Đổi tranh tiếp theo"
          title="Xem tác phẩm tiếp theo trong phòng tranh"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
            <path fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.985a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clip-rule="evenodd" />
          </svg>
        </button>
      {/if}
    </div>

    <!-- Transparent Divider -->
    <div class="w-px h-4 bg-white/20" aria-hidden="true"></div>

    <!-- 3. Action Buttons & Zen Mode -->
    <div class="flex items-center gap-1 sm:gap-1.5">
      <!-- Viết nhật ký -->
      <button
        type="button"
        onclick={onOpenJournalWrite}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-light tracking-wide text-white/85 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {activeModal === 'write' ? 'bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : ''}"
        aria-label="Viết nhật ký"
        title="Mở bảng ghi lại suy ngẫm an yên"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
          <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
        </svg>
        <span class="hidden sm:inline">Viết nhật ký</span>
      </button>

      <!-- Danh sách bài viết -->
      <button
        type="button"
        onclick={onOpenJournalList}
        class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-light text-white/85 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer {activeModal === 'list' ? 'bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : ''}"
        aria-label="Danh sách bài viết"
        title="Xem lại các trang nhật ký đã lưu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
          <path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" />
        </svg>
        <span class="hidden md:inline">Nhật ký</span>
      </button>

      <!-- Zen / Immersion Mode Button -->
      {#if onToggleZenMode}
        <button
          type="button"
          onclick={onToggleZenMode}
          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer ml-0.5"
          aria-label="Ẩn bảng điều khiển để tận hưởng tranh toàn màn hình"
          title="Chế độ tĩnh lặng: Ẩn bảng điều khiển để ngắm trọn vẹn bức tranh"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" />
          </svg>
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
