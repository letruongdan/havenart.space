<script lang="ts">
  import { MorphIcon } from 'morphicons/svelte';
  import { Copy, Share2, Download, Check, X, ShieldCheck, Sparkles } from 'lucide';
  import type { SupportedLanguage } from '../lib/i18n/types';

  interface Props {
    title: string;
    body: string;
    mood?: string;
    lang?: SupportedLanguage;
    onClose: () => void;
  }

  let { title, body, mood = 'calm', lang = 'vi', onClose }: Props = $props();

  let copied = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;
  let canNativeShare = $state(typeof navigator !== 'undefined' && !!navigator.share);

  const moodEmojis: Record<string, string> = {
    calm: '🍃',
    grateful: '✨',
    reflective: '🌙',
    peaceful: '🕊️',
    hopeful: '☀️',
  };

  let formattedDate = $derived.by(() => {
    return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  });

  function getShareQuoteText(): string {
    const emoji = moodEmojis[mood] || '🍃';
    const cleanTitle = title.trim() ? `"${title.trim()}"` : (lang === 'vi' ? 'Một thoáng suy ngẫm' : 'A quiet reflection');
    return `${emoji} ${cleanTitle}\n\n${body.trim()}\n\n— Haven Art • ${formattedDate}\nhttps://havenart.space`;
  }

  async function handleCopyQuote() {
    const text = getShareQuoteText();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      copied = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        copied = false;
      }, 3000);
    } catch (err) {
      console.warn('Lỗi sao chép trích dẫn:', err);
    }
  }

  async function handleNativeShare() {
    const text = getShareQuoteText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: title.trim() || 'Haven Art Reflection',
          text,
          url: 'https://havenart.space',
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Lỗi native share:', err);
        }
      }
    } else {
      handleCopyQuote();
    }
  }

  function handleDownloadTxt() {
    const text = getShareQuoteText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedTitle = (title.trim() || 'haven-note')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
    a.download = `${sanitizedTitle}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
  role="dialog"
  aria-modal="true"
  aria-labelledby="share-modal-title"
>
  <div
    class="relative w-full max-w-lg bg-stone-900/90 text-stone-100 border border-white/20 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl max-h-[90vh] overflow-y-auto font-sans"
  >
    <!-- Modal Header -->
    <div class="flex items-center justify-between pb-4 border-b border-white/10">
      <div class="flex items-center gap-2">
        <span class="p-1.5 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20">
          <MorphIcon icon={Share2} size={16} strokeWidth={2} spring="smooth" reducedMotion="user" />
        </span>
        <h3 id="share-modal-title" class="text-base sm:text-lg font-serif font-medium text-white">
          {lang === 'vi' ? 'Chia Sẻ Trang Ghi Chú' : 'Share Reflection Note'}
        </h3>
      </div>

      <button
        type="button"
        onclick={onClose}
        class="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-colors cursor-pointer"
        aria-label="Đóng bảng chia sẻ"
      >
        <MorphIcon icon={X} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
      </button>
    </div>

    <!-- Artful Quote Card Preview -->
    <div class="my-5 p-5 rounded-2xl bg-white/[0.04] border border-white/15 shadow-inner backdrop-blur-md relative overflow-hidden group">
      <div class="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none"></div>

      <!-- Card Top Info -->
      <div class="flex items-center justify-between text-xs text-white/50 mb-3 pb-2 border-b border-white/10">
        <div class="flex items-center gap-1.5">
          <span>{moodEmojis[mood] || '🍃'}</span>
          <span class="font-serif capitalize">{mood}</span>
        </div>
        <span class="font-mono text-[11px]">{formattedDate}</span>
      </div>

      <!-- Card Content -->
      {#if title.trim()}
        <h4 class="text-base font-serif font-medium text-white/95 mb-2 leading-snug">
          {title}
        </h4>
      {/if}

      <p class="text-xs sm:text-sm text-white/80 font-light leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto pr-1">
        {body.trim() || (lang === 'vi' ? '(Chưa có nội dung ghi chú)' : '(Empty note)')}
      </p>

      <!-- Signature -->
      <div class="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-amber-300/70">
        <span class="flex items-center gap-1">
          <MorphIcon icon={Sparkles} size={11} strokeWidth={2} />
          <span>Haven Art — Góc tĩnh lặng cho tâm hồn</span>
        </span>
        <span class="text-white/30 text-[10px]">havenart.space</span>
      </div>
    </div>

    <!-- Share Actions -->
    <div class="space-y-2.5">
      <!-- Copy Quote Button -->
      <button
        type="button"
        onclick={handleCopyQuote}
        class="w-full py-2.5 px-4 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer {copied ? 'bg-emerald-500 text-black shadow-md' : 'bg-amber-400 hover:bg-amber-300 text-black shadow-sm'}"
      >
        {#if copied}
          <MorphIcon icon={Check} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>{lang === 'vi' ? 'Đã sao chép trích dẫn nghệ thuật!' : 'Artful quote copied!'}</span>
        {:else}
          <MorphIcon icon={Copy} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>{lang === 'vi' ? 'Sao chép dạng trích dẫn nghệ thuật' : 'Copy Artful Quote'}</span>
        {/if}
      </button>

      <div class="grid grid-cols-2 gap-2">
        <!-- Native Share (if available) -->
        <button
          type="button"
          onclick={handleNativeShare}
          class="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <MorphIcon icon={Share2} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>{lang === 'vi' ? 'Chia sẻ ứng dụng' : 'Share via App'}</span>
        </button>

        <!-- Download TXT -->
        <button
          type="button"
          onclick={handleDownloadTxt}
          class="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <MorphIcon icon={Download} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>{lang === 'vi' ? 'Tải file ghi chú' : 'Save as .txt'}</span>
        </button>
      </div>
    </div>

    <!-- Security & Privacy Reassurance Notice -->
    <div class="mt-4 pt-3 border-t border-white/10 flex items-start gap-2 text-[11px] text-white/50">
      <MorphIcon icon={ShieldCheck} size={13} strokeWidth={2} class="shrink-0 text-emerald-400 mt-0.5" />
      <p>
        {lang === 'vi'
          ? 'Chỉ những nội dung bạn chủ động nhấn sao chép hoặc chia sẻ mới được gửi đi. Toàn bộ nhật ký gốc luôn được bảo vệ an toàn trên thiết bị của bạn.'
          : 'Only snippets you explicitly choose to copy or share will leave your screen. Your private reflections remain encrypted on your device.'}
      </p>
    </div>
  </div>
</div>
