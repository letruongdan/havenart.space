<script lang="ts">
  import { verifyAdminLogin, setAdminToken, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } from '../../lib/admin/auth';
  import { MorphIcon } from 'morphicons/svelte';
  import { ShieldCheck, Lock, User, Eye, EyeOff, ArrowLeft, AlertTriangle } from 'lucide';

  interface Props {
    onAuthenticated: () => void;
  }

  let props: Props = $props();

  let username = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let showHint = $state(false);

  async function handleLogin(e?: Event) {
    if (e) e.preventDefault();
    if (isLoading) return;

    isLoading = true;
    errorMessage = null;

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAdminToken(data.token);
        props.onAuthenticated();
        return;
      }

      if (data.error) {
        errorMessage = data.error;
        return;
      }

      // Client-side fallback if server unavailable
      const result = await verifyAdminLogin(username, password);
      if (result.success) {
        props.onAuthenticated();
      } else {
        errorMessage = result.error || 'Xác thực không thành công.';
      }
    } catch {
      // Network failure, attempt client verification fallback
      try {
        const result = await verifyAdminLogin(username, password);
        if (result.success) {
          props.onAuthenticated();
        } else {
          errorMessage = result.error || 'Xác thực không thành công.';
        }
      } catch (err: any) {
        errorMessage = err?.message || 'Lỗi hệ thống khi đăng nhập.';
      }
    } finally {
      isLoading = false;
    }
  }

  function fillDefaultCredentials() {
    username = DEFAULT_ADMIN_USERNAME;
    password = DEFAULT_ADMIN_PASSWORD;
    showHint = true;
  }

  async function handleQuickAdminLogin() {
    username = DEFAULT_ADMIN_USERNAME;
    password = DEFAULT_ADMIN_PASSWORD;
    await handleLogin();
  }
</script>

<div class="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#090a0d] text-stone-100 font-sans selection:bg-amber-400/30">
  <!-- Subtle ambient glow background -->
  <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
    <div class="w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px]"></div>
    <div class="w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px]"></div>
  </div>

  <div class="relative z-10 w-full max-w-md">
    <!-- Back to Haven link -->
    <div class="mb-5 flex justify-start">
      <a
        href="/"
        class="inline-flex items-center gap-2 text-xs font-light text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
      >
        <MorphIcon icon={ArrowLeft} size={14} strokeWidth={1.75} />
        <span>Trở về Haven Art</span>
      </a>
    </div>

    <!-- Login Card -->
    <div
      class="bg-black/50 border border-white/15 rounded-3xl p-7 sm:p-9 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/10 space-y-6"
    >
      <!-- Header Icon & Title -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.15)] mb-2">
          <MorphIcon icon={ShieldCheck} size={28} strokeWidth={1.75} />
        </div>
        <h1 class="text-2xl font-serif font-medium text-white tracking-wide">
          Bảng Quản Trị Hệ Thống
        </h1>
        <p class="text-xs text-white/60 font-light leading-relaxed max-w-xs mx-auto">
          Khu vực bảo mật dành cho quản trị viên. Vui lòng nhập thông tin xác thực để truy cập.
        </p>
      </div>

      <!-- Error Alert -->
      {#if errorMessage}
        <div
          role="alert"
          class="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-light animate-fade-in"
        >
          <MorphIcon icon={AlertTriangle} size={16} class="text-rose-400 shrink-0 mt-0.5" />
          <div class="flex-1 leading-relaxed">{errorMessage}</div>
        </div>
      {/if}

      <!-- Form -->
      <form onsubmit={handleLogin} class="space-y-4">
        <!-- Username Field -->
        <div class="space-y-1.5">
          <label for="admin-user" class="block text-xs font-light text-white/80">
            Tên đăng nhập
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
              <MorphIcon icon={User} size={15} strokeWidth={1.75} />
            </div>
            <input
              id="admin-user"
              type="text"
              bind:value={username}
              placeholder="Nhập tên tài khoản..."
              autocomplete="username"
              required
              class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 focus:border-white/40 text-white placeholder-white/30 text-sm font-light focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
            />
          </div>
        </div>

        <!-- Password Field -->
        <div class="space-y-1.5">
          <label for="admin-pass" class="block text-xs font-light text-white/80">
            Mật khẩu
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
              <MorphIcon icon={Lock} size={15} strokeWidth={1.75} />
            </div>
            <input
              id="admin-pass"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              placeholder="Nhập mật khẩu..."
              autocomplete="current-password"
              required
              class="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/5 border border-white/15 focus:border-white/40 text-white placeholder-white/30 text-sm font-light focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
            />
            <button
              type="button"
              onclick={() => (showPassword = !showPassword)}
              class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white cursor-pointer focus:outline-none"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <MorphIcon icon={showPassword ? EyeOff : Eye} size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full py-3 px-4 rounded-2xl bg-amber-400/25 hover:bg-amber-400/35 border border-amber-400/40 text-white font-medium text-sm tracking-wide shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:shadow-[0_0_25px_rgba(251,191,36,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 flex items-center justify-center gap-2 mt-2"
        >
          {#if isLoading}
            <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
            <span>Đang xác thực...</span>
          {:else}
            <MorphIcon icon={Lock} size={15} strokeWidth={2} />
            <span>Đăng nhập Quản trị</span>
          {/if}
        </button>
      </form>

      <!-- Default Credentials Helper Banner -->
      <div class="pt-3 border-t border-white/10 space-y-2">
        <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/70 space-y-1.5">
          <div class="flex items-center justify-between text-[11px] text-white/40 pb-1 border-b border-white/5">
            <span>Tài khoản Quản trị viên</span>
            <button
              type="button"
              onclick={fillDefaultCredentials}
              class="text-amber-300 hover:text-amber-200 underline cursor-pointer"
            >
              Tự động điền
            </button>
          </div>
          <div class="font-mono text-[11px] space-y-0.5">
            <div>Root Admin: <span class="text-amber-300 font-semibold">{DEFAULT_ADMIN_USERNAME}</span> / <span class="text-amber-300 font-semibold">{DEFAULT_ADMIN_PASSWORD}</span></div>
            <div class="text-[10px] text-white/40">Hoặc tài khoản cá nhân: <span class="text-cyan-300">danc3vh@gmail.com</span> (đã được cấp quyền Admin)</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
