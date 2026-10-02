<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
    type LanguageInfo,
  } from '../lib/i18n/types';
  import {
    detectUserLanguage,
    setStoredLanguage,
  } from '../lib/i18n/store';

  interface Props {
    currentLanguage?: SupportedLanguage;
    onLanguageChange?: (lang: SupportedLanguage) => void;
  }

  let props: Props = $props();

  let selectedLang = $state<SupportedLanguage>('en');
  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement | null = $state(null);

  $effect(() => {
    selectedLang = props.currentLanguage || detectUserLanguage();
  });

  onMount(() => {

    function handleDocumentClick(e: MouseEvent) {
      if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
        isOpen = false;
      }
    }

    function handleDocumentKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        isOpen = false;
      }
    }

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeydown);
    };
  });

  function handleSelect(lang: SupportedLanguage) {
    selectedLang = lang;
    setStoredLanguage(lang);
    isOpen = false;
    if (props.onLanguageChange) {
      props.onLanguageChange(lang);
    }
  }

  let activeLangInfo = $derived(
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0]
  );
</script>

<div class="relative inline-block text-left" bind:this={dropdownRef}>
  <!-- Language Trigger Button -->
  <button
    type="button"
    onclick={() => { isOpen = !isOpen; }}
    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 hover:border-white/40 text-xs text-white/90 hover:text-white backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 cursor-pointer select-none"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-label="Chọn ngôn ngữ / Select language"
  >
    <span class="text-sm leading-none">{activeLangInfo.flag}</span>
    <span class="font-medium tracking-wide uppercase">{activeLangInfo.code}</span>
    <svg
      class="w-3 h-3 text-white/60 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Floating Language Dropdown Menu -->
  {#if isOpen}
    <div
      class="absolute right-0 mt-2 w-48 rounded-2xl bg-black/75 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)] py-1.5 z-50 focus:outline-none font-sans overflow-hidden ring-1 ring-white/10 transition-all duration-200"
      role="listbox"
      aria-label="Danh sách ngôn ngữ"
    >
      <div class="px-3 py-1.5 border-b border-white/10 text-[10px] uppercase font-mono tracking-wider text-white/40">
        Ngôn ngữ / Language
      </div>

      <div class="max-h-64 overflow-y-auto py-1">
        {#each SUPPORTED_LANGUAGES as lang (lang.code)}
          <button
            type="button"
            onclick={() => handleSelect(lang.code)}
            class="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left {selectedLang === lang.code ? 'bg-amber-400/15 text-amber-200 font-medium' : 'text-white/80 hover:text-white hover:bg-white/10'}"
            role="option"
            aria-selected={selectedLang === lang.code}
          >
            <div class="flex items-center gap-2.5">
              <span class="text-base leading-none">{lang.flag}</span>
              <span class="font-normal">{lang.nativeName}</span>
            </div>
            {#if selectedLang === lang.code}
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
