<script lang="ts">
  import { onMount } from 'svelte';
  import { MorphIcon } from 'morphicons/svelte';
  import {
    User,
    Lock,
    Mail,
    Cloud,
    RefreshCw,
    LogOut,
    CheckCircle2,
    AlertCircle,
    X,
    Shield,
    Sparkles,
  } from 'lucide';
  import {
    getCurrentUser,
    isUserLoggedIn,
    loginUser,
    registerUser,
    logoutUser,
    checkSessionWithServer,
    type AuthUser,
  } from '../lib/auth/user-client';
  import { syncAllWithServer, getLastSyncedAt } from '../lib/sync/cloud-sync';
  import type { JournalRepository } from '../lib/db/repository';
  import type { SupportedLanguage } from '../lib/i18n/types';

  interface Props {
    repo?: JournalRepository;
    lang?: SupportedLanguage;
    onClose: () => void;
    onUserChange?: (user: AuthUser | null) => void;
  }

  let { repo, lang = 'vi', onClose, onUserChange }: Props = $props();

  let mode = $state<'login' | 'register'>('login');
  let email = $state('');
  let password = $state('');
  let name = $state('');
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  let currentUser = $state<AuthUser | null>(getCurrentUser());
  let serverEntryCount = $state<number | null>(null);
  let isSyncing = $state(false);
  let lastSyncedTime = $state<number | null>(getLastSyncedAt());

  onMount(async () => {
    if (isUserLoggedIn()) {
      const verified = await checkSessionWithServer();
      if (verified.valid && verified.user) {
        currentUser = verified.user;
        serverEntryCount = verified.serverEntryCount ?? null;
      } else {
        currentUser = null;
      }
    }
  });

  async function handleAuthSubmit(e: Event) {
    e.preventDefault();
    errorMessage = null;
    successMessage = null;

    if (!email.trim() || !password.trim()) {
      errorMessage = lang === 'vi' ? 'Vui lòng nhập đầy đủ thông tin.' : 'Please enter all fields.';
      return;
    }

    if (password.length < 6) {
      errorMessage = lang === 'vi' ? 'Mật khẩu phải có ít nhất 6 ký tự.' : 'Password must be at least 6 characters.';
      return;
    }

    isLoading = true;
    try {
      if (mode === 'register') {
        const res = await registerUser({
          email: email.trim(),
          password: password.trim(),
          name: name.trim() || undefined,
        });

        if (res.success && res.user) {
          currentUser = res.user;
          successMessage = lang === 'vi' ? 'Đăng ký thành công! Dữ liệu của bạn đã được kết nối máy chủ.' : 'Account registered successfully!';
          onUserChange?.(res.user);
          if (repo) {
            triggerFullSync();
          }
        } else {
          errorMessage = res.error || (lang === 'vi' ? 'Không thể đăng ký tài khoản.' : 'Registration failed.');
        }
      } else {
        const res = await loginUser({
          email: email.trim(),
          password: password.trim(),
        });

        if (res.success && res.user) {
          currentUser = res.user;
          successMessage = lang === 'vi' ? 'Đăng nhập thành công! Bắt đầu đồng bộ dữ liệu...' : 'Logged in successfully!';
          onUserChange?.(res.user);
          if (repo) {
            triggerFullSync();
          }
        } else {
          errorMessage = res.error || (lang === 'vi' ? 'Email hoặc mật khẩu không chính xác.' : 'Invalid credentials.');
        }
      }
    } catch (err: any) {
      errorMessage = err?.message || (lang === 'vi' ? 'Lỗi kết nối máy chủ.' : 'Network error.');
    } finally {
      isLoading = false;
    }
  }

  async function triggerFullSync() {
    if (!repo) return;
    isSyncing = true;
    errorMessage = null;
    try {
      const res = await syncAllWithServer(repo);
      if (res.success) {
        lastSyncedTime = res.lastSyncedAt || Date.now();
        serverEntryCount = res.serverTotal;
        successMessage = lang === 'vi'
          ? `Đồng bộ hoàn tất: Đã lưu ${res.serverTotal} bài viết trên máy chủ an toàn.`
          : `Sync complete: ${res.serverTotal} entries stored safely on server.`;
      } else {
        errorMessage = res.error || (lang === 'vi' ? 'Đồng bộ không thành công.' : 'Sync failed.');
      }
    } catch (err: any) {
      errorMessage = err?.message || (lang === 'vi' ? 'Lỗi kết nối khi đồng bộ.' : 'Sync error.');
    } finally {
      isSyncing = false;
    }
  }

  function handleLogout() {
    logoutUser();
    currentUser = null;
    successMessage = null;
    errorMessage = null;
    serverEntryCount = null;
    onUserChange?.(null);
  }

  function formatSyncTime(ts: number | null): string {
    if (!ts) return lang === 'vi' ? 'Chưa từng đồng bộ' : 'Never synced';
    const date = new Date(ts);
    return date.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
  role="dialog"
  aria-modal="true"
  aria-labelledby="auth-modal-title"
>
  <div
    class="relative w-full max-w-md bg-stone-900/90 text-stone-100 border border-white/20 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl max-h-[90vh] overflow-y-auto font-sans"
  >
    <!-- Modal Header -->
    <div class="flex items-center justify-between pb-4 border-b border-white/10">
      <div class="flex items-center gap-2">
        <span class="p-1.5 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20">
          <MorphIcon icon={Cloud} size={16} strokeWidth={2} spring="smooth" reducedMotion="user" />
        </span>
        <h3 id="auth-modal-title" class="text-base sm:text-lg font-serif font-medium text-white">
          {currentUser
            ? (lang === 'vi' ? 'Tài Khoản & Lưu Trữ Đám Mây' : 'Account & Cloud Storage')
            : (mode === 'login'
                ? (lang === 'vi' ? 'Đăng Nhập Máy Chủ' : 'Server Sign In')
                : (lang === 'vi' ? 'Đăng Ký Tài Khoản Mới' : 'Create New Account'))}
        </h3>
      </div>

      <button
        type="button"
        onclick={onClose}
        class="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-colors cursor-pointer"
        aria-label="Đóng bảng đăng nhập"
      >
        <MorphIcon icon={X} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
      </button>
    </div>

    <!-- Alert Notices -->
    {#if errorMessage}
      <div class="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
        <MorphIcon icon={AlertCircle} size={14} strokeWidth={2} class="shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    {#if successMessage}
      <div class="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
        <MorphIcon icon={CheckCircle2} size={14} strokeWidth={2} class="shrink-0" />
        <span>{successMessage}</span>
      </div>
    {/if}

    <!-- CASE 1: USER IS LOGGED IN -->
    {#if currentUser}
      <div class="py-5 space-y-4">
        <!-- User Profile Card -->
        <div class="p-4 rounded-2xl bg-white/5 border border-white/15 flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-black flex items-center justify-center font-serif text-lg font-bold shadow-md shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium text-white truncate">{currentUser.name}</h4>
            <p class="text-xs text-white/50 truncate font-mono">{currentUser.email}</p>
            <div class="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-300">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{lang === 'vi' ? 'Đã kết nối máy chủ Cloud' : 'Connected to Cloud Vault'}</span>
            </div>
          </div>
        </div>

        <!-- Sync Status Metrics -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs">
          <div class="flex items-center justify-between text-white/70">
            <span>{lang === 'vi' ? 'Số bài viết lưu trên máy chủ:' : 'Entries stored on server:'}</span>
            <span class="font-mono text-white font-medium">{serverEntryCount !== null ? `${serverEntryCount} bài` : 'Đang kiểm tra...'}</span>
          </div>
          <div class="flex items-center justify-between text-white/70">
            <span>{lang === 'vi' ? 'Thời gian đồng bộ gần nhất:' : 'Last synchronized:'}</span>
            <span class="font-mono text-amber-300/90">{formatSyncTime(lastSyncedTime)}</span>
          </div>
        </div>

        <!-- Cloud Sync Actions -->
        <div class="space-y-2 pt-1">
          <button
            type="button"
            onclick={triggerFullSync}
            disabled={isSyncing}
            class="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {#if isSyncing}
              <div class="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              <span>{lang === 'vi' ? 'Đang đồng bộ dữ liệu...' : 'Synchronizing...'}</span>
            {:else}
              <MorphIcon icon={RefreshCw} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>{lang === 'vi' ? 'Đồng bộ hai chiều ngay' : 'Sync With Server Now'}</span>
            {/if}
          </button>

          <button
            type="button"
            onclick={handleLogout}
            class="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-200 border border-white/10 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <MorphIcon icon={LogOut} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>{lang === 'vi' ? 'Đăng xuất tài khoản' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

    <!-- CASE 2: USER NOT LOGGED IN (SHOW LOGIN / REGISTER FORM) -->
    {:else}
      <!-- Mode Tabs -->
      <div class="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-white/10 mt-4 mb-5">
        <button
          type="button"
          onclick={() => { mode = 'login'; errorMessage = null; }}
          class="py-2 rounded-lg text-xs font-medium transition-all cursor-pointer {mode === 'login' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}"
        >
          {lang === 'vi' ? 'Đăng nhập' : 'Sign In'}
        </button>
        <button
          type="button"
          onclick={() => { mode = 'register'; errorMessage = null; }}
          class="py-2 rounded-lg text-xs font-medium transition-all cursor-pointer {mode === 'register' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}"
        >
          {lang === 'vi' ? 'Đăng ký tài khoản' : 'Register'}
        </button>
      </div>

      <form onsubmit={handleAuthSubmit} class="space-y-3.5">
        {#if mode === 'register'}
          <div>
            <label for="auth-name" class="block text-xs text-white/70 mb-1">
              {lang === 'vi' ? 'Tên hiển thị' : 'Your Name'}
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-white/40">
                <MorphIcon icon={User} size={14} strokeWidth={2} />
              </span>
              <input
                id="auth-name"
                type="text"
                bind:value={name}
                placeholder={lang === 'vi' ? 'Tên hoặc biệt danh của bạn' : 'e.g. Maya Lin'}
                class="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-colors"
              />
            </div>
          </div>
        {/if}

        <div>
          <label for="auth-email" class="block text-xs text-white/70 mb-1">
            Email
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-white/40">
              <MorphIcon icon={Mail} size={14} strokeWidth={2} />
            </span>
            <input
              id="auth-email"
              type="email"
              required
              bind:value={email}
              placeholder="name@example.com"
              class="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-colors"
            />
          </div>
        </div>

        <div>
          <label for="auth-password" class="block text-xs text-white/70 mb-1">
            {lang === 'vi' ? 'Mật khẩu' : 'Password'}
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-white/40">
              <MorphIcon icon={Lock} size={14} strokeWidth={2} />
            </span>
            <input
              id="auth-password"
              type="password"
              required
              minlength="6"
              bind:value={password}
              placeholder="••••••••"
              class="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-colors"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          {#if isLoading}
            <div class="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            <span>{lang === 'vi' ? 'Đang xử lý...' : 'Processing...'}</span>
          {:else}
            <MorphIcon icon={mode === 'login' ? User : Sparkles} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>{mode === 'login' ? (lang === 'vi' ? 'Đăng nhập vào Haven' : 'Sign In') : (lang === 'vi' ? 'Tạo tài khoản & Bắt đầu lưu' : 'Create Account')}</span>
          {/if}
        </button>
      </form>

      <!-- Cloud Benefits Reassurance -->
      <div class="mt-5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-[11px] text-white/60">
        <div class="flex items-center gap-2 text-white/80 font-medium">
          <MorphIcon icon={Shield} size={13} strokeWidth={2} class="text-amber-300" />
          <span>{lang === 'vi' ? 'Lợi ích khi đăng nhập máy chủ:' : 'Why create an account?'}</span>
        </div>
        <p>
          {lang === 'vi'
            ? '✓ Lưu trữ an toàn trên server: không bao giờ sợ mất bài viết khi dọn bộ nhớ máy.\n✓ Tự động đồng bộ hai chiều khi đổi điện thoại, máy tính hoặc trình duyệt khác.'
            : '✓ Secure server vault: never lose your notes even if device cache is cleared.\n✓ Access and sync your reflections seamlessly across all devices.'}
        </p>
      </div>
    {/if}
  </div>
</div>
