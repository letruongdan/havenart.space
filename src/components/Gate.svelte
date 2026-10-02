<script lang="ts">
  import { MorphIcon } from 'morphicons/svelte';
  import { Sparkles, ArrowRight } from 'lucide';

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
    class="max-w-sm w-full mx-auto px-8 py-10 rounded-3xl bg-black/20 hover:bg-black/25 backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/10 transition-all duration-700 ease-out"
  >
    <!-- Insignia: Zen Ensō Ring with MorphIcon -->
    <div class="mb-5 flex justify-center">
      <div
        class="w-14 h-14 rounded-full bg-white/5 border border-white/20 flex items-center justify-center text-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform duration-700 hover:scale-105"
      >
        <MorphIcon
          icon={Sparkles}
          size={26}
          strokeWidth={1.5}
          spring="smooth"
          reducedMotion="user"
        />
      </div>
    </div>

    <!-- Title and Serene Subtitle -->
    <h1 class="text-4xl sm:text-5xl font-serif font-light tracking-wider text-white mb-2 drop-shadow-md">
      Haven Art
    </h1>
    <p class="text-xs sm:text-sm font-light text-white/70 tracking-widest uppercase mb-8 font-sans">
      Góc tĩnh lặng cho tâm hồn
    </p>

    <!-- Gate Enter Action Button -->
    <button
      type="button"
      onclick={handleClick}
      onkeydown={handleKeyDown}
      class="group relative inline-flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-full text-sm font-medium tracking-wide text-white bg-white/10 hover:bg-white/20 border border-white/25 hover:border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] backdrop-blur-md transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-98 cursor-pointer"
      aria-label="Bước vào không gian Haven Art"
    >
      <span class="relative z-10 font-sans font-medium tracking-widest text-sm">Bước vào</span>
      <MorphIcon
        icon={ArrowRight}
        size={16}
        strokeWidth={2}
        spring="smooth"
        reducedMotion="user"
        class="transition-transform duration-300 group-hover:translate-x-1 text-white/80"
      />
    </button>

    <div class="mt-4 text-[10px] text-white/40 tracking-wider">
      Nhấn <kbd class="px-1.5 py-0.5 rounded bg-white/10 border border-white/15">Enter</kbd> hoặc <kbd class="px-1.5 py-0.5 rounded bg-white/10 border border-white/15">Space</kbd> để bước vào
    </div>
  </div>
</div>
