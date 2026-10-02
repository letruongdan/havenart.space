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
    registerLiveArtworks,
  } from '../lib/visuals/artwork-selector';
  import {
    searchPexelsLivePhotos,
    hasPexelsApiKey,
  } from '../lib/visuals/pexels-api';
  import {
    selectTrackForSession,
    selectNextTrack,
    recordPlayedTrack,
  } from '../lib/audio/track-selector';
  import { ALL_HAVEN_AUDIO_TRACKS, type HavenAudioTrack } from '../lib/audio/ambient-catalog';
  import { MorphIcon } from 'morphicons/svelte';
  import { X, Eye, Cloud, User } from 'lucide';
  import LanguagePicker from './LanguagePicker.svelte';
  import FeedbackModal from './FeedbackModal.svelte';
  import MusicLibraryModal from './MusicLibraryModal.svelte';
  import UserAuthModal from './UserAuthModal.svelte';
  import { getCurrentUser, type AuthUser } from '../lib/auth/user-client';
  import { recordVisit, updateActiveDuration } from '../lib/telemetry/user-analytics';
  import { detectUserLanguage, t } from '../lib/i18n/store';
  import type { SupportedLanguage } from '../lib/i18n/types';

  interface Props {
    initialLang?: SupportedLanguage;
  }

  let shellProps: Props = $props();

  let currentLang = $state<SupportedLanguage>(detectUserLanguage());

  $effect(() => {
    if (shellProps.initialLang) {
      currentLang = shellProps.initialLang;
    }
  });
  let experienceState = $state<'gate' | 'haven'>('gate');
  let activeModal = $state<'write' | 'list' | 'feedback' | 'music' | 'auth' | null>(null);
  let authUser = $state<AuthUser | null>(getCurrentUser());
  let journalRepo = $state<JournalRepository | null>(null);
  let journalRefreshTrigger = $state(0);
  let isZenMode = $state(false);
  let editingEntry = $state<JournalEntry | null>(null);
  let durationTimerId: ReturnType<typeof setInterval> | null = null;

  // Audio state
  let isPlaying = $state(false);
  let volume = $state(0.4);
  let currentTrackTitle = $state('');
  let currentTrackArtist = $state('');
  let currentTrack = $state<AudioTrack | null>(null);
  let audioReason = $state<string>('');
  let soundCategory = $state<'all' | 'piano' | 'ambient'>('all');

  // Visual state: Start with static artwork for full-screen immersive painting experience
  let visualMode = $state<VisualMode>('static');
  let currentArtwork = $state<Artwork | null>(null);

  // Weather & Mood Context
  let weatherInfo = $state<WeatherInfo | null>(null);
  let selectionReason = $state<string>('');
  let activeMood = $state<string | null>(null);

  let weatherDisplay = $derived.by(() => {
    if (!weatherInfo) return '';
    const conditionText = t(`weather.${weatherInfo.condition}` as any, currentLang) || (currentLang === 'vi' ? weatherInfo.descriptionVi : weatherInfo.condition);
    if (weatherInfo.temperature !== undefined) {
      return `${conditionText} • ${Math.round(weatherInfo.temperature)}°C`;
    }
    return conditionText;
  });

  let audioEngine: AudioEngine | null = null;
  let visualController: VisualController | null = null;
  let canvasElement: HTMLCanvasElement | null = $state(null);

  async function loadLivePexelsIfAvailable() {
    if (!hasPexelsApiKey()) return;
    try {
      const livePhotos = await searchPexelsLivePhotos({
        weather: weatherInfo?.condition,
        mood: activeMood || undefined,
        perPage: 15,
      });
      if (livePhotos && livePhotos.length > 0) {
        registerLiveArtworks(livePhotos);
      }
    } catch (e) {
      console.warn('Pexels live fetch notice:', e);
    }
  }

  onMount(() => {
    loadLivePexelsIfAvailable();
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
        loadLivePexelsIfAvailable();
      })
      .catch((err) => {
        console.warn('Weather detection notice:', err);
      });

    recordVisit();

    durationTimerId = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        updateActiveDuration(5, isPlaying);
      }
    }, 5000);

    function onLanguageChangeEvent(event: Event) {
      const customEvent = event as CustomEvent<{ lang: SupportedLanguage }>;
      if (customEvent.detail?.lang) {
        currentLang = customEvent.detail.lang;
      }
    }

    function onPexelsKeyChangeEvent() {
      loadLivePexelsIfAvailable();
    }

    function onAuthChangeEvent(event: Event) {
      const customEvent = event as CustomEvent<{ session: any }>;
      authUser = customEvent.detail?.session?.user || null;
    }

    window.addEventListener('haven:language-change', onLanguageChangeEvent);
    window.addEventListener('haven:pexels-key-changed', onPexelsKeyChangeEvent);
    window.addEventListener('haven:user-auth-changed', onAuthChangeEvent);

    return () => {
      window.removeEventListener('haven:language-change', onLanguageChangeEvent);
      window.removeEventListener('haven:pexels-key-changed', onPexelsKeyChangeEvent);
      window.removeEventListener('haven:user-auth-changed', onAuthChangeEvent);
    };
  });

  let isIdle = $state(false);
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function handleUserActivity() {
    if (isIdle) isIdle = false;
    if (idleTimer) clearTimeout(idleTimer);
    if (activeModal !== null) return;

    idleTimer = setTimeout(() => {
      if (activeModal === null) {
        isIdle = true;
      }
    }, 4500);
  }

  onDestroy(() => {
    if (idleTimer) clearTimeout(idleTimer);
    if (durationTimerId) clearInterval(durationTimerId);
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
        category: soundCategory,
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

  async function handleToggleSoundCategory() {
    const categories: ('all' | 'piano' | 'ambient')[] = ['all', 'piano', 'ambient'];
    const nextIdx = (categories.indexOf(soundCategory) + 1) % categories.length;
    soundCategory = categories[nextIdx];

    const result = selectTrackForSession({
      category: soundCategory,
      weather: weatherInfo?.condition,
      timeOfDay: weatherInfo?.timeOfDay,
      mood: activeMood || undefined,
    });
    currentTrack = result.track;
    audioReason = result.reason;
    currentTrackTitle = result.track.title;
    currentTrackArtist = result.track.artist;
    if (audioEngine) {
      await audioEngine.setTrack(result.track);
      isPlaying = audioEngine.isPlaying();
    }
  }

  function handleOpenMusicLibrary() {
    activeModal = activeModal === 'music' ? null : 'music';
  }

  async function handleSelectTrackFromLibrary(track: HavenAudioTrack) {
    currentTrack = track;
    currentTrackTitle = track.title;
    currentTrackArtist = track.artist;
    audioReason = track.category === 'piano'
      ? `Độc tấu Piano • ${track.genreVi}`
      : `Âm thanh tự nhiên • ${track.genreVi}`;

    if (audioEngine) {
      await audioEngine.setTrack(track);
      if (!audioEngine.isPlaying()) {
        await audioEngine.play();
      }
      isPlaying = audioEngine.isPlaying();
    }
    recordPlayedTrack(track.id);
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
    loadLivePexelsIfAvailable();

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
    handleUserActivity();
    if (activeModal === 'write') {
      activeModal = null;
      editingEntry = null;
    } else {
      editingEntry = null;
      activeModal = 'write';
    }
    if (isZenMode) isZenMode = false;
  }

  function handleOpenJournalList() {
    handleUserActivity();
    activeModal = activeModal === 'list' ? null : 'list';
    if (isZenMode) isZenMode = false;
  }

  function handleCloseModal() {
    handleUserActivity();
    activeModal = null;
    editingEntry = null;
  }

  function handleJournalSaved(savedEntry: JournalEntry) {
    journalRefreshTrigger += 1;
    if (savedEntry.mood) {
      handleMoodChange(savedEntry.mood);
    }
  }

  function handleToggleZenMode() {
    handleUserActivity();
    isZenMode = !isZenMode;
  }

  function handleOpenFeedback() {
    handleUserActivity();
    activeModal = activeModal === 'feedback' ? null : 'feedback';
    if (isZenMode) isZenMode = false;
  }

  function handleWindowKeyDown(event: KeyboardEvent) {
    handleUserActivity();

    // Secret shortcut for administrator: Ctrl + Shift + A (or Cmd + Shift + A)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'A' || event.key === 'a')) {
      event.preventDefault();
      window.location.href = '/admin';
      return;
    }

    if (event.key === 'Escape') {
      if (activeModal !== null) {
        handleCloseModal();
      } else if (isZenMode) {
        isZenMode = false;
      }
    }
  }
</script>

<svelte:window
  onkeydown={handleWindowKeyDown}
  onpointermove={handleUserActivity}
  ontouchstart={handleUserActivity}
/>

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
      class="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25 pointer-events-none"
    ></div>
  </div>

  <!-- Experience State: Gate Entrance -->
  {#if experienceState === 'gate'}
    <div
      class="relative z-20 w-full min-h-screen flex items-center justify-center transition-opacity duration-700 ease-out"
    >
      <Gate onEnter={handleEnter} lang={currentLang} />
    </div>
  {:else}
    <!-- Experience State: Haven Main View -->
    <div
      class="relative z-10 w-full min-h-screen flex flex-col justify-between p-4 sm:p-6 pointer-events-none transition-opacity duration-700 ease-out"
    >
      <!-- Ethereal Minimal Top Bar (Auto-hides on Idle / Zen Mode) -->
      <header
        class="pointer-events-auto flex items-center justify-between max-w-7xl w-full mx-auto px-2 pt-1 transition-all duration-700 {isZenMode || (isIdle && activeModal === null) ? '-translate-y-12 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}"
      >
        <!-- Distinct Brand Mark with Frosted Glass Protection & High Contrast -->
        <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/25 hover:bg-black/40 border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-md select-none transition-all duration-300">
          <span class="w-2 h-2 rounded-full bg-amber-300/90 shadow-[0_0_8px_#fbbf24]"></span>
          <span class="text-xs sm:text-sm font-sans tracking-[0.2em] uppercase font-medium text-white drop-shadow-sm">Haven Art</span>
        </div>

        <!-- Header Controls: Weather Whisper & Language Picker -->
        <div class="flex items-center gap-2">
          {#if weatherDisplay}
            <div class="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/25 hover:bg-black/40 border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-md select-none transition-all duration-300 font-sans">
              <span class="text-xs sm:text-sm font-normal text-white/95 tracking-wide drop-shadow-sm">{weatherDisplay}</span>
            </div>
          {/if}

          <!-- Language Picker -->
          <LanguagePicker
            currentLanguage={currentLang}
            onLanguageChange={(l) => {
              currentLang = l;
            }}
          />

          <!-- User Account / Cloud Sync Pill Button -->
          <button
            type="button"
            onclick={() => (activeModal = activeModal === 'auth' ? null : 'auth')}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/25 hover:bg-black/40 border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-md select-none transition-all duration-300 text-xs font-sans text-white/90 hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
            title={authUser ? (currentLang === 'vi' ? 'Tài khoản & Đồng bộ Cloud' : 'Account & Cloud Sync') : (currentLang === 'vi' ? 'Đăng nhập để lưu trên máy chủ' : 'Sign in to cloud')}
          >
            {#if authUser}
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="font-medium text-amber-200">{authUser.name.split(' ')[0]}</span>
            {:else}
              <MorphIcon icon={Cloud} size={13} strokeWidth={2} class="text-white/70" />
              <span>{currentLang === 'vi' ? 'Đăng nhập' : 'Sign In'}</span>
            {/if}
          </button>
        </div>
      </header>

      <!-- Center Space: Unobstructed, Pure Art Appreciation -->
      <main class="flex-1 flex items-center justify-center pointer-events-none">
        {#if isZenMode}
          <!-- Ambient Backdrop Clickable Layer in Zen Mode: Tap anywhere to exit Zen Mode -->
          <button
            type="button"
            onclick={() => (isZenMode = false)}
            class="fixed inset-0 z-30 cursor-pointer pointer-events-auto bg-transparent border-0 w-full h-full text-left"
            aria-label="Nhấn vào màn hình để hiện lại thanh điều khiển"
            title="Nhấn vào màn hình để hiện lại thanh điều khiển"
          >
            <span class="sr-only">Nhấn vào màn hình để hiện lại thanh điều khiển</span>
          </button>
        {/if}
      </main>

      <!-- Dedicated Floating "Exit Zen Mode" Pill Button when in Zen Mode -->
      {#if isZenMode}
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-fade-in">
          <button
            type="button"
            onclick={() => (isZenMode = false)}
            class="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/45 hover:bg-black/80 border border-white/25 hover:border-amber-400/60 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl text-xs text-white/90 hover:text-white transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 scale-100 hover:scale-105 active:scale-95"
            aria-label="{t('dock.exitZenMode', currentLang)} / Thoát chế độ tĩnh tâm"
            title="{t('dock.exitZenMode', currentLang)}"
          >
            <span class="w-6 h-6 rounded-full bg-white/10 group-hover:bg-amber-400/20 text-amber-300 flex items-center justify-center transition-colors">
              <MorphIcon icon={Eye} size={13} strokeWidth={2} />
            </span>
            <span class="font-medium tracking-wide drop-shadow-sm">{t('dock.exitZenMode', currentLang)}</span>
          </button>
        </div>
      {/if}

      <!-- Bottom Floating Frosted Glass Dock (Audio Player & Controls) -->
      <div class="pointer-events-auto transition-all duration-700 {isIdle && activeModal === null ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}">
        <Dock
          {isPlaying}
          {volume}
          trackTitle={currentTrackTitle}
          trackArtist={currentTrackArtist}
          {audioReason}
          {soundCategory}
          {visualMode}
          artworkTitle={currentArtwork?.title}
          artworkArtist={currentArtwork?.artist}
          {activeModal}
          {isZenMode}
          weatherLabel={weatherDisplay}
          {selectionReason}
          lang={currentLang}
          onTogglePlay={handleTogglePlay}
          onVolumeChange={handleVolumeChange}
          onNextTrack={handleNextTrack}
          onToggleSoundCategory={handleToggleSoundCategory}
          onToggleVisualMode={handleToggleVisualMode}
          onNextArtwork={handleNextArtwork}
          onOpenJournalWrite={handleOpenJournalWrite}
          onOpenJournalList={handleOpenJournalList}
          onOpenFeedback={handleOpenFeedback}
          onOpenMusicLibrary={handleOpenMusicLibrary}
          onToggleZenMode={handleToggleZenMode}
        />
      </div>
    </div>
  {/if}

  <!-- Modals / Overlays: Styled as Translucent Frosted Glass Over the Artwork -->
  {#if activeModal === 'feedback'}
    <FeedbackModal lang={currentLang} onClose={handleCloseModal} />
  {:else if activeModal === 'music'}
    <MusicLibraryModal
      currentTrackId={currentTrack?.id}
      {isPlaying}
      lang={currentLang}
      onSelectTrack={handleSelectTrackFromLibrary}
      onClose={handleCloseModal}
    />
  {:else if activeModal === 'auth'}
    <UserAuthModal
      repo={journalRepo || undefined}
      lang={currentLang}
      onClose={handleCloseModal}
      onUserChange={(u) => {
        authUser = u;
      }}
    />
  {:else if activeModal !== null}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="haven-modal-title"
    >
      <div
        class="relative w-full max-w-3xl bg-black/40 sm:bg-black/35 text-stone-100 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl max-h-[90vh] overflow-y-auto select-text font-sans ring-1 ring-white/10"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 id="haven-modal-title" class="text-xl sm:text-2xl font-serif font-medium text-white flex items-center gap-2.5 drop-shadow-sm">
            <span class="w-2 h-2 rounded-full bg-amber-300/90 shadow-[0_0_8px_#fbbf24]"></span>
            <span>{activeModal === 'write' ? (editingEntry ? t('write.editTitle', currentLang) : t('write.title', currentLang)) : t('journal.title', currentLang)}</span>
          </h2>
          <button
            type="button"
            onclick={handleCloseModal}
            class="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer shadow-sm"
            aria-label="{t('journal.close', currentLang)} / Đóng bảng nhật ký"
          >
            <MorphIcon
              icon={X}
              size={15}
              strokeWidth={2}
              spring="smooth"
              reducedMotion="user"
            />
          </button>
        </div>

        <!-- Modal Body Container -->
        <div class="pt-4">
          {#if activeModal === 'write'}
            <div id="journal-write-container">
              <WritePanel
                repository={journalRepo || undefined}
                editingEntry={editingEntry}
                lang={currentLang}
                onSaved={(savedEntry) => {
                  editingEntry = null;
                  handleJournalSaved(savedEntry);
                }}
                onCancelEdit={() => {
                  editingEntry = null;
                  activeModal = 'list';
                }}
                onMoodChange={handleMoodChange}
              />
            </div>
          {:else if activeModal === 'list'}
            <div id="journal-list-container">
              <JournalList
                repository={journalRepo || undefined}
                refreshTrigger={journalRefreshTrigger}
                lang={currentLang}
                onEditEntry={(entry) => {
                  editingEntry = entry;
                  activeModal = 'write';
                }}
              />
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
