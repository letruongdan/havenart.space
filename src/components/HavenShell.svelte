<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Gate from './Gate.svelte';
  import Dock from './Dock.svelte';
  import { AudioEngine } from '../lib/audio/engine';
  import type { AudioTrack } from '../lib/audio/tracks';
  import { VisualController, type VisualMode, type Artwork } from '../lib/visuals/controller';
  import WritePanel from './WritePanel.svelte';
  import JournalList from './JournalList.svelte';
  import { JournalRepository } from '../lib/db/repository';
  import type { JournalEntry } from '../lib/db/schema';
  import { detectWeather, type WeatherInfo } from '../lib/weather/weather';
  import {
    selectArtworkForSession,
    selectNextArtwork,
  } from '../lib/visuals/artwork-selector';
  import {
    selectTrackForSession,
    selectNextTrack,
  } from '../lib/audio/track-selector';
  import { ALL_HAVEN_AUDIO_TRACKS } from '../lib/audio/ambient-catalog';

  let experienceState = $state<'gate' | 'haven'>('gate');
  let activeModal = $state<'write' | 'list' | null>(null);
  let journalRepo = $state<JournalRepository | null>(null);
  let journalRefreshTrigger = $state(0);
  let isZenMode = $state(false);

  // Audio state
  let isPlaying = $state(false);
  let volume = $state(0.4);
  let currentTrackTitle = $state('');
  let currentTrackArtist = $state('');
  let currentTrack = $state<AudioTrack | null>(null);
  let audioReason = $state<string>('');

  // Visual state: Start with static artwork for full-screen immersive painting experience
  let visualMode = $state<VisualMode>('static');
  let currentArtwork = $state<Artwork | null>(null);

  // Weather & Mood Context
  let weatherInfo = $state<WeatherInfo | null>(null);
  let weatherLabel = $state<string>('');
  let selectionReason = $state<string>('');
  let activeMood = $state<string | null>(null);

  let audioEngine: AudioEngine | null = null;
  let visualController: VisualController | null = null;
  let canvasElement: HTMLCanvasElement | null = $state(null);

  onMount(() => {
    // 1. Initialize Audio Engine & Select Unique Ambient Track for this Visit
    try {
      const initialTrackSelection = selectTrackForSession();
      currentTrack = initialTrackSelection.track;
      audioReason = initialTrackSelection.reason;
      currentTrackTitle = initialTrackSelection.track.title;
      currentTrackArtist = initialTrackSelection.track.artist;

      audioEngine = new AudioEngine({
        tracks: ALL_HAVEN_AUDIO_TRACKS,
      });
      volume = audioEngine.getVolume();
      audioEngine.setTrack(initialTrackSelection.track);
    } catch (e) {
      console.warn('AudioEngine init warning:', e);
    }

    // 2. Initialize Visual Controller & Select Unique Image for this Visit
    try {
      // Pick a fresh image guaranteed to differ from previous visits
      const initialSelection = selectArtworkForSession();
      currentArtwork = initialSelection.artwork;
      selectionReason = initialSelection.reason;

      visualController = new VisualController({
        artworks: [initialSelection.artwork],
        onModeChange: (newMode) => {
          visualMode = newMode;
        },
        onArtworkChange: (newArt) => {
          currentArtwork = newArt;
        },
      });

      // Default to static artwork display so the painting fills the screen
      visualController.setMode('static');
      visualMode = visualController.getActiveMode();
      visualController.setArtwork(initialSelection.artwork);
    } catch (e) {
      console.warn('VisualController init warning:', e);
    }

    // 3. Initialize Journal Repository & Adapt to Recent Journal Mood
    try {
      journalRepo = new JournalRepository();
      journalRepo
        .init()
        .then(async () => {
          if (!journalRepo) return;
          const entries = await journalRepo.listActiveEntries();
          if (entries.length > 0 && entries[0].mood) {
            activeMood = entries[0].mood;

            // Adapt artwork to mood
            const moodArtSelection = selectArtworkForSession({
              mood: activeMood,
              weather: weatherInfo?.condition,
              timeOfDay: weatherInfo?.timeOfDay,
            });
            currentArtwork = moodArtSelection.artwork;
            selectionReason = moodArtSelection.reason;
            visualController?.setArtwork(moodArtSelection.artwork);

            // Adapt audio track to mood
            const moodTrackSelection = selectTrackForSession({
              mood: activeMood,
              weather: weatherInfo?.condition,
              timeOfDay: weatherInfo?.timeOfDay,
            });
            currentTrack = moodTrackSelection.track;
            audioReason = moodTrackSelection.reason;
            currentTrackTitle = moodTrackSelection.track.title;
            currentTrackArtist = moodTrackSelection.track.artist;
            audioEngine?.setTrack(moodTrackSelection.track);
          }
        })
        .catch((e) => {
          console.warn('JournalRepository init warning:', e);
        });
    } catch (e) {
      console.warn('JournalRepository init warning:', e);
    }

    // 4. Detect Local Weather in Background & Adapt Image and Audio
    detectWeather()
      .then((info) => {
        weatherInfo = info;
        if (info.temperature !== undefined) {
          weatherLabel = `${info.descriptionVi} • ${Math.round(info.temperature)}°C`;
        } else {
          weatherLabel = info.descriptionVi;
        }

        // If no explicit journal mood is prioritized, adapt to local weather & time of day
        if (!activeMood) {
          // Adapt Artwork
          const weatherSelection = selectArtworkForSession({
            weather: info.condition,
            timeOfDay: info.timeOfDay,
          });
          currentArtwork = weatherSelection.artwork;
          selectionReason = weatherSelection.reason;
          visualController?.setArtwork(weatherSelection.artwork);

          // Adapt Audio
          const weatherTrackSelection = selectTrackForSession({
            weather: info.condition,
            timeOfDay: info.timeOfDay,
          });
          currentTrack = weatherTrackSelection.track;
          audioReason = weatherTrackSelection.reason;
          currentTrackTitle = weatherTrackSelection.track.title;
          currentTrackArtist = weatherTrackSelection.track.artist;
          audioEngine?.setTrack(weatherTrackSelection.track);
        }
      })
      .catch((err) => {
        console.warn('Weather detection notice:', err);
      });
  });

  onDestroy(() => {
    audioEngine?.destroy();
    visualController?.destroy();
    journalRepo?.close().catch(() => {});
  });

  // When canvas is mounted, initialize visual controller WebGL pipeline
  $effect(() => {
    if (canvasElement && visualController) {
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
      const result = selectNextTrack({
        currentId: currentTrack?.id,
        weather: weatherInfo?.condition,
        timeOfDay: weatherInfo?.timeOfDay,
        mood: activeMood || undefined,
      });
      currentTrack = result.track;
      audioReason = result.reason;
      currentTrackTitle = result.track.title;
      currentTrackArtist = result.track.artist;
      await audioEngine.setTrack(result.track);
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
    const result = selectNextArtwork({
      currentId: currentArtwork?.id,
      weather: weatherInfo?.condition,
      timeOfDay: weatherInfo?.timeOfDay,
      mood: activeMood || undefined,
    });
    currentArtwork = result.artwork;
    selectionReason = result.reason;
    visualController?.setArtwork(result.artwork);
  }

  function handleMoodChange(newMood: string) {
    activeMood = newMood;

    // Adapt visual artwork to selected mood
    const artResult = selectArtworkForSession({
      mood: newMood,
      weather: weatherInfo?.condition,
      timeOfDay: weatherInfo?.timeOfDay,
    });
    currentArtwork = artResult.artwork;
    selectionReason = artResult.reason;
    visualController?.setArtwork(artResult.artwork);

    // Adapt audio soundscape to selected mood
    const trackResult = selectTrackForSession({
      mood: newMood,
      weather: weatherInfo?.condition,
      timeOfDay: weatherInfo?.timeOfDay,
    });
    currentTrack = trackResult.track;
    audioReason = trackResult.reason;
    currentTrackTitle = trackResult.track.title;
    currentTrackArtist = trackResult.track.artist;
    audioEngine?.setTrack(trackResult.track);
  }

  function handleOpenJournalWrite() {
    activeModal = activeModal === 'write' ? null : 'write';
    if (isZenMode) isZenMode = false;
  }

  function handleOpenJournalList() {
    activeModal = activeModal === 'list' ? null : 'list';
    if (isZenMode) isZenMode = false;
  }

  function handleCloseModal() {
    activeModal = null;
  }

  function handleJournalSaved(savedEntry: JournalEntry) {
    journalRefreshTrigger += 1;
    if (savedEntry.mood) {
      handleMoodChange(savedEntry.mood);
    }
  }

  function handleToggleZenMode() {
    isZenMode = !isZenMode;
  }

  function handleWindowKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (activeModal !== null) {
        handleCloseModal();
      } else if (isZenMode) {
        isZenMode = false;
      }
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeyDown} />

<div
  class="relative w-full min-h-screen overflow-hidden bg-[#0d0e12] text-white selection:bg-amber-400/30 font-sans"
>
  <!-- Full-Screen Artwork & Visual Presentation -->
  <div class="fixed inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
    <!-- WebGL2 Shader Canvas -->
    <canvas
      bind:this={canvasElement}
      class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out {visualMode === 'shader' ? 'opacity-100' : 'opacity-0'}"
    ></canvas>

    <!-- Curated Masterpiece Artwork (Full-Bleed Cover) -->
    {#if currentArtwork}
      <img
        src={currentArtwork.src}
        alt={currentArtwork.title}
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out {visualMode === 'static' ? 'opacity-100' : 'opacity-0'}"
      />
    {/if}

    <!-- Subtle, ethereal vignette & gradient overlay to ensure UI elements pop while keeping image vivid -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60 pointer-events-none"
    ></div>
  </div>

  <!-- Experience State: Gate Entrance -->
  {#if experienceState === 'gate'}
    <div
      class="relative z-20 w-full min-h-screen flex items-center justify-center transition-opacity duration-700 ease-out"
    >
      <Gate onEnter={handleEnter} />
    </div>
  {:else}
    <!-- Experience State: Haven Main View -->
    <div
      class="relative z-10 w-full min-h-screen flex flex-col justify-between p-4 sm:p-6 pointer-events-none transition-opacity duration-700 ease-out"
    >
      <!-- Ethereal Top Glass Header (Auto-hides in Zen Mode) -->
      <header
        class="pointer-events-auto flex items-center justify-between max-w-7xl w-full mx-auto gap-3 transition-all duration-700 {isZenMode ? '-translate-y-16 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}"
      >
        <!-- Brand Pill -->
        <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/35 backdrop-blur-xl border border-white/15 shadow-lg text-white shrink-0">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]"></span>
          <span class="text-xs font-serif tracking-wider font-medium">Haven Art</span>
        </div>

        <!-- Weather / Mood Badge Capsule -->
        {#if weatherLabel || selectionReason}
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-xl border border-white/15 text-xs text-amber-200/90 shadow-lg truncate max-w-[280px] sm:max-w-md">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fcd34d] shrink-0"></span>
            <span class="font-light truncate">{weatherLabel || selectionReason}</span>
          </div>
        {/if}

        <!-- Artwork Info Capsule -->
        {#if currentArtwork}
          <div class="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/35 backdrop-blur-xl border border-white/15 text-xs text-stone-200 shadow-lg shrink-0">
            <span class="font-serif italic truncate max-w-[160px]">{currentArtwork.title}</span>
            <span class="text-white/40">•</span>
            <span class="text-stone-300 font-light truncate max-w-[140px]">{currentArtwork.artist}</span>
          </div>
        {/if}
      </header>

      <!-- Center Space: Unobstructed, Pure Art Appreciation -->
      <main class="flex-1 flex items-center justify-center pointer-events-none"></main>

      <!-- Bottom Floating Frosted Glass Dock (Audio Player & Controls) -->
      <div class="pointer-events-auto">
        <Dock
          {isPlaying}
          {volume}
          trackTitle={currentTrackTitle}
          trackArtist={currentTrackArtist}
          {audioReason}
          {visualMode}
          artworkTitle={currentArtwork?.title}
          artworkArtist={currentArtwork?.artist}
          {activeModal}
          {isZenMode}
          {weatherLabel}
          {selectionReason}
          onTogglePlay={handleTogglePlay}
          onVolumeChange={handleVolumeChange}
          onNextTrack={handleNextTrack}
          onToggleVisualMode={handleToggleVisualMode}
          onNextArtwork={handleNextArtwork}
          onOpenJournalWrite={handleOpenJournalWrite}
          onOpenJournalList={handleOpenJournalList}
          onToggleZenMode={handleToggleZenMode}
        />
      </div>
    </div>
  {/if}

  <!-- Modals / Overlays: Styled as Translucent Frosted Glass Over the Artwork -->
  {#if activeModal !== null}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="haven-modal-title"
    >
      <div
        class="relative w-full max-w-2xl bg-stone-950/80 text-stone-100 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl max-h-[90vh] overflow-y-auto select-text font-sans"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 id="haven-modal-title" class="text-xl font-serif font-light text-white flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>{activeModal === 'write' ? 'Góc viết nhật ký' : 'Danh sách bài viết'}</span>
          </h2>
          <button
            type="button"
            onclick={handleCloseModal}
            class="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer"
            aria-label="Đóng bảng nhật ký"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <!-- Modal Body Container -->
        <div class="pt-4">
          {#if activeModal === 'write'}
            <div id="journal-write-container">
              <WritePanel
                repository={journalRepo}
                onSaved={handleJournalSaved}
                onMoodChange={handleMoodChange}
              />
            </div>
          {:else if activeModal === 'list'}
            <div id="journal-list-container">
              <JournalList repository={journalRepo} refreshTrigger={journalRefreshTrigger} />
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
