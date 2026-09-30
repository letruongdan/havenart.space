<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Gate from './Gate.svelte';
  import Dock from './Dock.svelte';
  import { AudioEngine } from '../lib/audio/engine';
  import { VisualController, type VisualMode, type Artwork } from '../lib/visuals/controller';

  let experienceState = $state<'gate' | 'haven'>('gate');
  let activeModal = $state<'write' | 'list' | null>(null);

  // Audio state
  let isPlaying = $state(false);
  let volume = $state(0.4);
  let currentTrackTitle = $state('');
  let currentTrackArtist = $state('');

  // Visual state
  let visualMode = $state<VisualMode>('shader');
  let currentArtwork = $state<Artwork | null>(null);

  let audioEngine: AudioEngine | null = null;
  let visualController: VisualController | null = null;
  let canvasElement: HTMLCanvasElement | null = $state(null);

  onMount(() => {
    try {
      audioEngine = new AudioEngine();
      volume = audioEngine.getVolume();
      const track = audioEngine.getCurrentTrack();
      if (track) {
        currentTrackTitle = track.title;
        currentTrackArtist = track.artist;
      }
    } catch (e) {
      console.warn('AudioEngine init warning:', e);
    }

    try {
      visualController = new VisualController({
        onModeChange: (newMode) => {
          visualMode = newMode;
        },
        onArtworkChange: (newArt) => {
          currentArtwork = newArt;
        },
      });
      visualMode = visualController.getActiveMode();
      currentArtwork = visualController.getCurrentImage();
    } catch (e) {
      console.warn('VisualController init warning:', e);
    }
  });

  onDestroy(() => {
    audioEngine?.destroy();
    visualController?.destroy();
  });

  // When experience enters haven and canvas is mounted, initialize visual controller
  $effect(() => {
    if (experienceState === 'haven' && canvasElement && visualController) {
      visualController.init(canvasElement).catch((err) => {
        console.warn('VisualController canvas init warning:', err);
      });
    }
  });

  async function handleEnter() {
    if (audioEngine) {
      try {
        await audioEngine.unlockAudio();
        await audioEngine.play();
        isPlaying = audioEngine.isPlaying();
        const curTrack = audioEngine.getCurrentTrack();
        if (curTrack) {
          currentTrackTitle = curTrack.title;
          currentTrackArtist = curTrack.artist;
        }
      } catch (err) {
        console.warn('Playback initiation error on gate enter:', err);
      }
    }

    experienceState = 'haven';
  }

  async function handleTogglePlay() {
    if (!audioEngine) return;
    try {
      if (!audioEngine.isUnlocked()) {
        await audioEngine.unlockAudio();
      }
      await audioEngine.togglePlay();
      isPlaying = audioEngine.isPlaying();
      const track = audioEngine.getCurrentTrack();
      if (track) {
        currentTrackTitle = track.title;
        currentTrackArtist = track.artist;
      }
    } catch (err) {
      console.warn('Toggle play error:', err);
    }
  }

  function handleVolumeChange(val: number) {
    volume = val;
    audioEngine?.setVolume(val);
  }

  async function handleNextTrack() {
    if (!audioEngine) return;
    try {
      await audioEngine.nextTrack();
      const track = audioEngine.getCurrentTrack();
      if (track) {
        currentTrackTitle = track.title;
        currentTrackArtist = track.artist;
      }
      isPlaying = audioEngine.isPlaying();
    } catch (err) {
      console.warn('Next track error:', err);
    }
  }

  function handleToggleVisualMode() {
    if (!visualController) return;
    const targetMode: VisualMode = visualMode === 'shader' ? 'static' : 'shader';
    visualController.setMode(targetMode);
    visualMode = visualController.getActiveMode();
  }

  function handleNextArtwork() {
    if (!visualController) return;
    currentArtwork = visualController.nextImage();
  }

  function handleOpenJournalWrite() {
    activeModal = activeModal === 'write' ? null : 'write';
  }

  function handleOpenJournalList() {
    activeModal = activeModal === 'list' ? null : 'list';
  }

  function handleCloseModal() {
    activeModal = null;
  }

  function handleWindowKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && activeModal !== null) {
      handleCloseModal();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeyDown} />

<div
  class="relative w-full min-h-screen overflow-hidden bg-[#fbf9f5] dark:bg-[#121316] text-[#1c1917] dark:text-[#f5f5f4] transition-colors duration-700"
>
  <!-- Background Visual Presentation (Shader Canvas or Static Artwork) -->
  <div class="fixed inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
    <canvas
      bind:this={canvasElement}
      class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out {visualMode === 'shader' ? 'opacity-100' : 'opacity-0'}"
    ></canvas>

    {#if currentArtwork}
      <img
        src={currentArtwork.src}
        alt={currentArtwork.title}
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out {visualMode === 'static' ? 'opacity-100' : 'opacity-0'}"
      />
    {/if}

    <!-- Calm vignette overlay ensuring high contrast and zero eye strain -->
    <div
      class="absolute inset-0 bg-stone-900/10 dark:bg-stone-950/30 backdrop-blur-[0.5px]"
    ></div>
  </div>

  <!-- Experience State: Gate -->
  {#if experienceState === 'gate'}
    <div
      class="relative z-20 w-full min-h-screen flex items-center justify-center transition-opacity duration-700 ease-out"
    >
      <Gate onEnter={handleEnter} />
    </div>
  {:else}
    <!-- Experience State: Haven Main View -->
    <div
      class="relative z-10 w-full min-h-screen flex flex-col justify-between p-6 pointer-events-none transition-opacity duration-700 ease-out"
    >
      <!-- Top Serene Navigation Bar -->
      <header class="pointer-events-auto flex items-center justify-between max-w-7xl w-full mx-auto select-none">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-amber-100/60 dark:bg-amber-950/40 border border-amber-300/40 dark:border-amber-700/30 flex items-center justify-center text-amber-800 dark:text-amber-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4" aria-hidden="true">
              <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.061l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.061l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 10 18ZM4.25 10a.75.75 0 0 1-.75.75H2a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.061ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
            </svg>
          </div>
          <div>
            <h1 class="text-sm font-serif font-medium tracking-wide text-stone-900/90 dark:text-stone-100/90">
              Haven Art
            </h1>
            <p class="text-[11px] text-stone-500 dark:text-stone-400 font-light">
              Góc tĩnh lặng cho tâm hồn
            </p>
          </div>
        </div>

        <!-- Serene Status / Quote Indicator -->
        <div class="hidden sm:block text-right">
          <p class="text-xs text-stone-600/80 dark:text-stone-300/80 font-serif italic">
            "Trong tĩnh lặng, tâm an."
          </p>
          {#if currentArtwork}
            <p class="text-[11px] text-stone-400 dark:text-stone-500 font-light">
              {currentArtwork.title} — {currentArtwork.artist}
            </p>
          {/if}
        </div>
      </header>

      <!-- Center Space (Uncluttered, calm) -->
      <main class="flex-1 flex items-center justify-center pointer-events-none select-none">
        <!-- Calm breathing visual prompt if no modal is active -->
        {#if activeModal === null}
          <div class="text-center opacity-40 hover:opacity-80 transition-opacity duration-500 pointer-events-auto">
            <p class="text-sm font-light tracking-widest text-stone-600 dark:text-stone-300 uppercase">
              Thở sâu & Tĩnh tại
            </p>
          </div>
        {/if}
      </main>

      <!-- Bottom Floating Calm Dock -->
      <div class="pointer-events-auto">
        <Dock
          {isPlaying}
          {volume}
          trackTitle={currentTrackTitle}
          trackArtist={currentTrackArtist}
          {visualMode}
          artworkTitle={currentArtwork?.title}
          artworkArtist={currentArtwork?.artist}
          {activeModal}
          onTogglePlay={handleTogglePlay}
          onVolumeChange={handleVolumeChange}
          onNextTrack={handleNextTrack}
          onToggleVisualMode={handleToggleVisualMode}
          onNextArtwork={handleNextArtwork}
          onOpenJournalWrite={handleOpenJournalWrite}
          onOpenJournalList={handleOpenJournalList}
        />
      </div>
    </div>
  {/if}

  <!-- Modals / Overlays for Journal Write and Journal List -->
  {#if activeModal !== null}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="haven-modal-title"
    >
      <div
        class="relative w-full max-w-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-stone-900 dark:text-stone-100 max-h-[90vh] overflow-y-auto"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-stone-200/80 dark:border-stone-800">
          <h2 id="haven-modal-title" class="text-xl font-serif font-light text-stone-900 dark:text-stone-100">
            {activeModal === 'write' ? 'Góc viết nhật ký' : 'Danh sách bài viết'}
          </h2>
          <button
            type="button"
            onclick={handleCloseModal}
            class="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
            aria-label="Đóng bảng nhật ký"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <!-- Modal Body Content -->
        <div class="py-6">
          {#if activeModal === 'write'}
            <div id="journal-write-container" class="space-y-4">
              <p class="text-sm text-stone-600 dark:text-stone-300 font-light leading-relaxed">
                Nơi ghi lại những suy ngẫm, cảm xúc và giây phút an yên. Mọi dòng chữ của bạn được mã hóa an toàn và lưu trữ nội bộ trên thiết bị.
              </p>
              <div class="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/50 text-xs text-stone-500 dark:text-stone-400">
                Trình viết nhật ký riêng tư — Không thu thập dữ liệu cá nhân.
              </div>
            </div>
          {:else if activeModal === 'list'}
            <div id="journal-list-container" class="space-y-4">
              <p class="text-sm text-stone-600 dark:text-stone-300 font-light leading-relaxed">
                Những khoảnh khắc bạn đã lưu giữ. Bạn có thể xem lại, tìm kiếm hoặc xuất bản sao lưu bất kỳ lúc nào.
              </p>
              <div class="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/50 text-xs text-stone-500 dark:text-stone-400">
                Danh sách bài viết được mã hóa cục bộ.
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
