<script lang="ts">
  interface Props {
    onEnter?: () => void;
  }

  let { onEnter }: Props = $props();

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      onEnter?.();
    }
  }

  function handleClick() {
    onEnter?.();
  }
</script>

<div
  class="relative flex flex-col items-center justify-center min-h-screen w-full px-4 text-center select-none"
  role="region"
  aria-label="Cổng đón Haven Art"
>
  <!-- Ultra-Minimalist Floating Glass Card -->
  <div
    class="max-w-sm w-full mx-auto px-8 py-10 rounded-3xl bg-black/25 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition-all duration-700 ease-out"
  >
    <!-- Insignia: Zen Ensō Ring -->
    <div class="mb-5 flex justify-center">
      <div
        class="w-14 h-14 rounded-full bg-white/10 border border-amber-300/40 flex items-center justify-center text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-transform duration-700 hover:scale-105"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-7 h-7"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
          />
        </svg>
      </div>
    </div>

    <!-- Title and Serene Subtitle -->
    <h1 class="text-3xl sm:text-4xl font-serif font-light tracking-wide text-white mb-2 drop-shadow-md">
      Haven Art
    </h1>
    <p class="text-xs sm:text-sm font-light text-stone-200/90 tracking-wide mb-8 font-sans">
      Góc tĩnh lặng cho tâm hồn
    </p>

    <!-- Gate Enter Action Button -->
    <button
      type="button"
      onclick={handleClick}
      onkeydown={handleKeyDown}
      class="group relative inline-flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-full text-sm font-medium tracking-wide text-white bg-gradient-to-r from-amber-500/80 to-amber-600/80 hover:from-amber-400/90 hover:to-amber-500/90 border border-amber-300/60 shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:shadow-[0_0_35px_rgba(245,158,11,0.55)] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-98 cursor-pointer"
      aria-label="Bước vào không gian Haven Art"
    >
      <span class="relative z-10 font-serif tracking-widest text-base">Bước vào</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </button>

    <div class="mt-4 text-[10px] text-stone-300/70 tracking-wider">
      Nhấn <kbd class="px-1.5 py-0.5 rounded bg-white/10 border border-white/20">Enter</kbd> hoặc <kbd class="px-1.5 py-0.5 rounded bg-white/10 border border-white/20">Space</kbd> để bước vào
    </div>
  </div>
</div>
