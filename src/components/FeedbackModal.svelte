<script lang="ts">
  import { modal } from '../lib/ui/modal';
  import { MorphIcon } from 'morphicons/svelte';
  import { X, Star, Heart, CheckCircle2 } from 'lucide';
  import { saveUserFeedback } from '../lib/telemetry/user-analytics';
  import { t } from '../lib/i18n/store';
  import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../lib/i18n/types';

  interface Props {
    lang?: SupportedLanguage;
    onClose: () => void;
  }

  let props: Props = $props();
  let activeLang = $derived(props.lang || DEFAULT_LANGUAGE);

  let rating = $state(5);
  let hoverRating = $state<number | null>(null);
  let category = $state<'peace' | 'music' | 'visuals' | 'journal' | 'general'>('peace');
  let comment = $state('');
  let submitError = $state('');
  let submitting = $state(false);
  let isSubmitted = $state(false);

  const categories = [
    { id: 'peace' as const, labelVi: 'Sự an yên', labelEn: 'Peace & Calm', icon: '🕊️' },
    { id: 'music' as const, labelVi: 'Âm thanh', labelEn: 'Music', icon: '🎹' },
    { id: 'visuals' as const, labelVi: 'Hội họa', labelEn: 'Art & Visuals', icon: '🎨' },
    { id: 'journal' as const, labelVi: 'Nhật ký', labelEn: 'Journal', icon: '📝' },
    { id: 'general' as const, labelVi: 'Chung', labelEn: 'Overall', icon: '✨' },
  ];

  import { getStoredUserSession } from '../lib/auth/user-client';

  const ratingLabels: Record<number, { vi: string; en: string }> = {
    1: { vi: 'Cần cải thiện', en: 'Needs improvement' },
    2: { vi: 'Khá ổn', en: 'Fair' },
    3: { vi: 'Bình thường', en: 'Good' },
    4: { vi: 'Rất thư thái', en: 'Very peaceful' },
    5: { vi: 'Tuyệt vời & An lành', en: 'Wonderful & Serene' },
  };

  async function handleSubmit() {
    const session = getStoredUserSession();
    if (submitting) return;
    submitting = true; submitError = '';

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.token ? {Authorization:`Bearer ${session.token}`} : {}) },
        body: JSON.stringify({
          rating,
          category,
          comment: comment.trim(),
          userId: session?.user?.id || null,
          userName: session?.user?.name || null,
          userEmail: session?.user?.email || null,
        }),
      });
      if (!response.ok) throw new Error('Không thể gửi cảm nhận. Vui lòng thử lại.');
      saveUserFeedback({rating,category,comment:comment.trim()});
    } catch {
      submitError = activeLang === 'vi' ? 'Chưa gửi được. Vui lòng thử lại.' : 'Unable to send. Please retry.';
      return;
    } finally { submitting = false; }

    isSubmitted = true;
    setTimeout(() => {
      props.onClose();
    }, 2500);
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300"
  use:modal
  role="dialog"
  aria-modal="true"
  aria-labelledby="feedback-modal-title"
>
  <div
    class="relative w-full max-w-lg bg-black/50 border border-white/20 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-stone-100 font-sans ring-1 ring-white/10"
  >
    <!-- Close button -->
    <div class="flex items-center justify-between pb-4 border-b border-white/10">
      <h2 id="feedback-modal-title" class="text-xl font-serif font-medium text-white flex items-center gap-2 drop-shadow-sm">
        <span class="text-amber-300">⭐</span>
        <span>{activeLang === 'vi' ? 'Cảm nhận & Đánh giá' : 'Peaceful Feedback & Rating'}</span>
      </h2>
      <button
        type="button"
        data-modal-close
        onclick={props.onClose}
        class="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer"
        aria-label="Đóng bảng đánh giá / Close feedback"
      >
        <MorphIcon icon={X} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
      </button>
    </div>

    {#if submitError}<p role="alert" class="text-red-200">{submitError}</p>{/if}
    {#if isSubmitted}
      <div class="py-10 text-center space-y-3 animate-fade-in">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <MorphIcon icon={CheckCircle2} size={24} strokeWidth={2} />
        </div>
        <h3 class="text-lg font-serif text-white">
          {activeLang === 'vi' ? 'Cảm ơn bạn đã gửi cảm nhận!' : 'Thank you for your feedback!'}
        </h3>
        <p class="text-xs text-white/70 font-light max-w-xs mx-auto">
          {activeLang === 'vi'
            ? 'Những đóng góp của bạn giúp Haven Art ngày càng tĩnh lặng và trọn vẹn hơn.'
            : 'Your reflection helps Haven Art cultivate an even more serene experience.'}
        </p>
      </div>
    {:else}
      <div class="pt-4 space-y-5">
        <!-- 1. Star Rating -->
        <div class="space-y-1.5 text-center">
          <span class="block text-xs font-light text-white/80 tracking-wide">
            {activeLang === 'vi' ? 'Bạn cảm thấy không gian hôm nay thế nào?' : 'How does this sanctuary feel to you today?'}
          </span>
          <div class="flex items-center justify-center gap-2 py-1">
            {#each [1, 2, 3, 4, 5] as star}
              <button
                type="button"
                onclick={() => (rating = star)}
                onmouseenter={() => (hoverRating = star)}
                onmouseleave={() => (hoverRating = null)}
                class="p-1 transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300 cursor-pointer"
                aria-label={`Đánh giá ${star} sao`}
              >
                <MorphIcon
                  icon={Star}
                  size={26}
                  strokeWidth={1.75}
                  class={(hoverRating !== null ? star <= hoverRating : star <= rating)
                    ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'text-white/30 hover:text-white/60'}
                />
              </button>
            {/each}
          </div>
          <div class="text-xs font-serif italic text-amber-200/90 h-4">
            {ratingLabels[hoverRating || rating]?.[activeLang === 'vi' ? 'vi' : 'en'] || ''}
          </div>
        </div>

        <!-- 2. Category selection chips -->
        <div class="space-y-1.5">
          <span class="block text-xs font-light text-white/70">
            {activeLang === 'vi' ? 'Về điều gì bạn muốn chia sẻ?' : 'What would you like to reflect on?'}
          </span>
          <div class="flex flex-wrap items-center gap-1.5">
            {#each categories as cat}
              <button
                type="button"
                onclick={() => (category = cat.id)}
                class="px-3 py-1 rounded-full text-xs font-light transition-all border cursor-pointer flex items-center gap-1.5 {category === cat.id
                  ? 'bg-white/20 border-white/40 text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.15)]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'}"
              >
                <span>{cat.icon}</span>
                <span>{activeLang === 'vi' ? cat.labelVi : cat.labelEn}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- 3. Text comment -->
        <div class="space-y-1.5">
          <label for="feedback-comment" class="block text-xs font-light text-white/70">
            {activeLang === 'vi' ? 'Cảm nhận hoặc lời nhắn của bạn (tùy chọn)' : 'Your reflection or thoughts (optional)'}
          </label>
          <textarea
            id="feedback-comment"
            bind:value={comment}
            rows="3"
            placeholder={activeLang === 'vi' ? 'Viết vài dòng chia sẻ cảm xúc hoặc gợi ý cải tiến...' : 'Share a thought, moment of calm, or suggestion...'}
            class="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/15 focus:border-white/40 text-white placeholder-white/30 text-xs sm:text-sm font-light leading-relaxed focus:outline-none focus:ring-1 focus:ring-white/40 resize-none transition-colors backdrop-blur-md"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            data-modal-close
        onclick={props.onClose}
            class="px-4 py-2 rounded-full text-xs font-light text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {activeLang === 'vi' ? 'Để sau' : 'Maybe later'}
          </button>
          <button
            type="button"
            onclick={handleSubmit}
            class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium tracking-wide text-white bg-amber-400/30 hover:bg-amber-400/40 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <span>{activeLang === 'vi' ? 'Gửi cảm nhận' : 'Send Feedback'}</span>
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
