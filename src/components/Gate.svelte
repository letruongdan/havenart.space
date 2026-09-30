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
  class="relative flex flex-col items-center justify-center min-h-screen w-full px-6 py-12 text-center select-none"
  role="region"
  aria-label="Cổng đón Haven Art"
>
  <div
    class="max-w-md w-full mx-auto p-8 sm:p-10 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/60 dark:border-stone-800/80 shadow-2xl transition-all duration-700 ease-out"
  >
    <!-- Gentle insignia / symbol -->
    <div class="mb-6 flex justify-center">
      <div
        class="w-16 h-16 rounded-full bg-amber-100/60 dark:bg-amber-950/40 flex items-center justify-center border border-amber-300/40 dark:border-amber-700/30 text-amber-800 dark:text-amber-200 transition-transform duration-700 hover:scale-105"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-8 h-8"
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

    <!-- Title and serene tagline -->
    <h1 class="text-3xl sm:text-4xl font-serif font-light tracking-wide text-stone-900 dark:text-stone-100 mb-3">
      Haven Art
    </h1>
    <p class="text-base sm:text-lg font-light text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
      Góc tĩnh lặng cho tâm hồn
    </p>

    <!-- Calming narrative text -->
    <p class="text-xs sm:text-sm font-light text-stone-500 dark:text-stone-400 mb-8 leading-relaxed max-w-sm mx-auto">
      Tạm gác lại âu lo thường nhật. Thả lỏng hơi thở, lắng nghe thanh âm bình yên và hòa mình vào không gian nghệ thuật tĩnh tại.
    </p>

    <!-- Gate Enter Action Button -->
    <button
      type="button"
      onclick={handleClick}
      onkeydown={handleKeyDown}
      class="group relative inline-flex items-center justify-center px-8 py-3.5 text-sm sm:text-base font-medium tracking-wide rounded-full text-stone-900 dark:text-stone-100 bg-amber-200/70 hover:bg-amber-300/80 dark:bg-amber-600/30 dark:hover:bg-amber-600/50 border border-amber-300/60 dark:border-amber-500/40 shadow-sm hover:shadow transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 active:scale-95 cursor-pointer"
      aria-label="Bước vào không gian Haven Art"
    >
      <span class="relative z-10 flex items-center gap-2">
        <span>Bước vào</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.75"
          stroke="currentColor"
          class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </span>
    </button>

    <div class="mt-6 text-[11px] text-stone-400 dark:text-stone-500 tracking-wider uppercase">
      Nhấn Enter hoặc Phím cách để bước vào
    </div>
  </div>
</div>
