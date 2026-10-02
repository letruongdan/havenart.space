<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { JournalRepository } from '../../lib/db/repository';
  import { ALL_HAVEN_AUDIO_TRACKS, type HavenAudioTrack } from '../../lib/audio/ambient-catalog';
  import { CURATED_ARTWORKS, type Artwork } from '../../lib/visuals/artworks';
  import {
    getSystemTelemetry,
    formatBytes,
    formatDuration,
    generateDiagnosticReport,
    logSystemEvent,
    getRecentEvents,
    clearRecentEvents,
    runDatabasePurge,
    requestStoragePersistence,
    clearAllPwaCaches,
    type SystemTelemetry,
    type SystemEvent,
  } from '../../lib/telemetry/system-monitor';
  import { BackupManager } from '../../lib/export/backup';
  import {
    isAdminAuthenticated,
    logoutAdmin,
    changeAdminPassword,
  } from '../../lib/admin/auth';
  import AdminLoginGate from './AdminLoginGate.svelte';
  import { deleteUserFeedback } from '../../lib/telemetry/user-analytics';
  import { MorphIcon } from 'morphicons/svelte';
  import {
    Activity,
    Database,
    Cpu,
    Wifi,
    Volume2,
    RefreshCw,
    Download,
    Trash2,
    Music,
    Image,
    CheckCircle2,
    AlertTriangle,
    Info,
    Clock,
    ArrowLeft,
    ExternalLink,
    Zap,
    BarChart2,
    ShieldCheck,
    Play,
    Pause,
    Layers,
    Users,
    Star,
    Heart,
    MessageSquare,
    KeyRound,
    LogOut,
    X,
    Lock,
  } from 'lucide';

  let repo = $state<JournalRepository | null>(null);
  let telemetry = $state<SystemTelemetry | null>(null);
  let activeTab = $state<'overview' | 'users' | 'database' | 'catalog' | 'diagnostics'>('overview');
  let autoRefresh = $state(true);
  let refreshInterval = $state(3); // seconds
  let timerId: ReturnType<typeof setInterval> | null = null;
  let statusNotice = $state<{ text: string; type: 'success' | 'warn' | 'error' } | null>(null);
  let noticeTimeout: ReturnType<typeof setTimeout> | null = null;

  // Authentication & Security State
  let isAuthenticated = $state(false);
  let showChangePasswordModal = $state(false);
  let currentPasswordInput = $state('');
  let newPasswordInput = $state('');
  let confirmPasswordInput = $state('');
  let changePasswordError = $state<string | null>(null);
  let changePasswordSuccess = $state<string | null>(null);
  let changePasswordLoading = $state(false);

  // Audio preview state inside admin
  let activePreviewTrackId = $state<string | null>(null);
  let previewAudioElement: HTMLAudioElement | null = null;

  // Event log filter
  let eventLevelFilter = $state<string>('all');

  function showNotice(text: string, type: 'success' | 'warn' | 'error' = 'success') {
    statusNotice = { text, type };
    if (noticeTimeout) clearTimeout(noticeTimeout);
    noticeTimeout = setTimeout(() => {
      statusNotice = null;
    }, 4000);
  }

  async function refreshTelemetry() {
    try {
      telemetry = await getSystemTelemetry({ repo });
    } catch (err: any) {
      console.warn('Lỗi thu thập thông số hệ thống:', err);
    }
  }

  async function initAdminData() {
    try {
      if (!repo) {
        repo = new JournalRepository();
        await repo.init();
        logSystemEvent({
          level: 'success',
          category: 'db',
          message: 'Khởi tạo kết nối IndexedDB Quản trị thành công',
        });
      }
    } catch (err: any) {
      logSystemEvent({
        level: 'warn',
        category: 'db',
        message: `Khởi tạo CSDL: ${err?.message || err}`,
      });
    }

    await refreshTelemetry();

    logSystemEvent({
      level: 'info',
      category: 'system',
      message: 'Mở trang Bảng điều khiển Quản trị Haven Art',
    });

    if (!timerId) {
      timerId = setInterval(() => {
        if (autoRefresh && isAuthenticated) {
          refreshTelemetry();
        }
      }, refreshInterval * 1000);
    }
  }

  onMount(async () => {
    isAuthenticated = isAdminAuthenticated();
    if (isAuthenticated) {
      await initAdminData();
    }
  });

  async function handleAuthenticated() {
    isAuthenticated = true;
    await initAdminData();
    showNotice('Đăng nhập quản trị viên thành công', 'success');
  }

  function handleLogout() {
    logoutAdmin();
    isAuthenticated = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    showNotice('Đã đăng xuất khỏi phiên quản trị viên.', 'info');
  }

  async function handleChangePassword(e?: Event) {
    if (e) e.preventDefault();
    if (changePasswordLoading) return;
    changePasswordError = null;
    changePasswordSuccess = null;

    if (!newPasswordInput || newPasswordInput.length < 6) {
      changePasswordError = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      changePasswordError = 'Xác nhận mật khẩu mới không trùng khớp.';
      return;
    }

    changePasswordLoading = true;
    try {
      const res = await changeAdminPassword(currentPasswordInput, newPasswordInput);
      if (res.success) {
        changePasswordSuccess = 'Đổi mật khẩu thành công!';
        showNotice('Đổi mật khẩu quản trị viên thành công!', 'success');
        currentPasswordInput = '';
        newPasswordInput = '';
        confirmPasswordInput = '';
        setTimeout(() => {
          showChangePasswordModal = false;
          changePasswordSuccess = null;
        }, 1500);
      } else {
        changePasswordError = res.error || 'Đổi mật khẩu thất bại.';
      }
    } catch (err: any) {
      changePasswordError = err?.message || 'Lỗi khi đổi mật khẩu.';
    } finally {
      changePasswordLoading = false;
    }
  }

  async function handleDeleteFeedback(id: string) {
    if (typeof window !== 'undefined' && window.confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) {
      deleteUserFeedback(id);
      await refreshTelemetry();
      showNotice('Đã xóa đánh giá của người dùng', 'info');
    }
  }

  onDestroy(() => {
    if (timerId) clearInterval(timerId);
    if (noticeTimeout) clearTimeout(noticeTimeout);
    if (previewAudioElement) {
      previewAudioElement.pause();
      previewAudioElement.src = '';
    }
    repo?.close().catch(() => {});
  });

  // Toggle audio preview
  function toggleAudioPreview(track: HavenAudioTrack) {
    if (activePreviewTrackId === track.id) {
      if (previewAudioElement) {
        previewAudioElement.pause();
      }
      activePreviewTrackId = null;
    } else {
      if (!previewAudioElement) {
        previewAudioElement = new Audio();
        previewAudioElement.addEventListener('ended', () => {
          activePreviewTrackId = null;
        });
      }
      previewAudioElement.src = track.src;
      previewAudioElement.volume = 0.5;
      previewAudioElement.play().then(() => {
        activePreviewTrackId = track.id;
        logSystemEvent({
          level: 'info',
          category: 'audio',
          message: `Nghe thử bản nhạc: ${track.title}`,
        });
      }).catch((e) => {
        showNotice(`Không thể phát thử âm thanh: ${e.message}`, 'error');
      });
    }
  }

  // Test sound beep using AudioContext oscillator
  function testAudioOscillator() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        showNotice('Web Audio API không được hỗ trợ trên trình duyệt này', 'error');
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // 440 Hz (Note A4)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // Ramp to A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      logSystemEvent({
        level: 'success',
        category: 'audio',
        message: 'Thử nghiệm Web Audio Oscillator (440Hz -> 880Hz) thành công',
      });
      showNotice('Phát thử nghiệm âm thanh Web Audio thành công!', 'success');
    } catch (err: any) {
      showNotice(`Lỗi Web Audio: ${err.message}`, 'error');
    }
  }

  // Handle Maintenance Actions
  async function handlePurgeDatabase() {
    if (!repo) return;
    const count = await runDatabasePurge(repo, 0);
    await refreshTelemetry();
    showNotice(`Đã dọn dẹp vĩnh viễn ${count} bài viết đã xóa tạm trong CSDL`, 'success');
  }

  async function handleRequestPersistence() {
    const isGranted = await requestStoragePersistence();
    await refreshTelemetry();
    if (isGranted) {
      showNotice('Trình duyệt đã cấp quyền lưu trữ bền vững (Persistent Storage)', 'success');
    } else {
      showNotice('Trình duyệt chưa thể cấp quyền lưu trữ bền vững tại thời điểm này', 'warn');
    }
  }

  async function handleClearCaches() {
    const count = await clearAllPwaCaches();
    await refreshTelemetry();
    showNotice(`Đã làm sạch ${count} bộ nhớ đệm PWA`, 'success');
  }

  async function handleExportBackup() {
    if (!repo) return;
    try {
      const backupMgr = new BackupManager(repo);
      const json = await backupMgr.exportDataAsJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `haven-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      logSystemEvent({
        level: 'success',
        category: 'db',
        message: 'Xuất sao lưu CSDL nhật ký thành công',
      });
      showNotice('Đã tải xuống tệp sao lưu dữ liệu JSON thành công', 'success');
    } catch (err: any) {
      showNotice(`Lỗi xuất dữ liệu: ${err.message}`, 'error');
    }
  }

  function handleDownloadDiagnosticReport() {
    if (!telemetry) return;
    const reportJson = generateDiagnosticReport(telemetry);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haven-system-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logSystemEvent({
      level: 'success',
      category: 'system',
      message: 'Tải xuống Báo cáo chẩn đoán hệ thống (JSON)',
    });
    showNotice('Đã xuất báo cáo chẩn đoán hệ thống thành công!', 'success');
  }

  function handleClearEvents() {
    clearRecentEvents();
    if (telemetry) {
      telemetry.events = [];
    }
    showNotice('Đã xóa toàn bộ nhật ký sự kiện', 'success');
  }

  let filteredEvents = $derived(
    telemetry?.events.filter((e) => {
      if (eventLevelFilter === 'all') return true;
      return e.level === eventLevelFilter;
    }) || []
  );

  const MOOD_META: Record<string, { label: string; icon: string; color: string }> = {
    calm: { label: 'Bình an', icon: '🍃', color: 'bg-emerald-500' },
    grateful: { label: 'Biết ơn', icon: '✨', color: 'bg-amber-400' },
    reflective: { label: 'Trầm tư', icon: '🌙', color: 'bg-indigo-400' },
    peaceful: { label: 'Tĩnh lặng', icon: '🕊️', color: 'bg-cyan-400' },
    hopeful: { label: 'Hy vọng', icon: '☀️', color: 'bg-yellow-400' },
  };

  const FEEDBACK_CATEGORY_META: Record<string, { label: string; icon: string }> = {
    peace: { label: 'Sự an yên', icon: '🕊️' },
    music: { label: 'Âm thanh', icon: '🎵' },
    visuals: { label: 'Hội họa', icon: '🎨' },
    journal: { label: 'Nhật ký', icon: '📖' },
    general: { label: 'Tổng quan', icon: '✨' },
  };
</script>

{#if !isAuthenticated}
  <AdminLoginGate onAuthenticated={handleAuthenticated} />
{:else}
<div class="min-h-screen bg-[#090a0d] text-stone-200 font-sans selection:bg-amber-500/25 selection:text-white pb-16">
  <!-- Top Navigation & System Status Header -->
  <header class="sticky top-0 z-40 bg-[#0d0e12]/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <!-- Brand & Identity -->
      <div class="flex items-center gap-3">
        <a
          href="/"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-white/80 hover:text-white transition-colors cursor-pointer group"
          title="Trở lại giao diện người dùng"
        >
          <MorphIcon icon={ArrowLeft} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>Về trang chủ</span>
        </a>

        <div class="h-4 w-px bg-white/20 hidden sm:block"></div>

        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]"></span>
          <h1 class="text-base sm:text-lg font-serif font-medium text-white tracking-wide">
            Haven Art <span class="text-xs sm:text-sm font-sans text-white/50 font-normal">| Quản Trị & Giám Sát</span>
          </h1>
        </div>

        <!-- Real-time Status Beacon -->
        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="font-sans">Hệ thống Trực tuyến</span>
        </div>
      </div>

      <!-- Action Buttons & Auto-refresh -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Session Clock -->
        {#if telemetry}
          <div class="hidden md:flex items-center gap-1.5 text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            <MorphIcon icon={Clock} size={13} strokeWidth={1.75} spring="smooth" reducedMotion="user" />
            <span>Phiên: {formatDuration(telemetry.uptimeSeconds)}</span>
          </div>
        {/if}

        <!-- Auto Refresh Toggle -->
        <button
          type="button"
          onclick={() => { autoRefresh = !autoRefresh; }}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all cursor-pointer {autoRefresh ? 'bg-amber-400/15 border-amber-400/30 text-amber-300' : 'bg-white/5 border-white/10 text-white/50'}"
          title="Bật/Tắt tự động cập nhật thông số"
        >
          <span class="w-1.5 h-1.5 rounded-full {autoRefresh ? 'bg-amber-400' : 'bg-white/30'}"></span>
          <span>Tự động ({refreshInterval}s)</span>
        </button>

        <!-- Manual Refresh Button -->
        <button
          type="button"
          onclick={refreshTelemetry}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-white/80 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
          title="Làm mới thông số ngay bây giờ"
        >
          <MorphIcon icon={RefreshCw} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>Làm mới</span>
        </button>

        <!-- Export Diagnostics -->
        <button
          type="button"
          onclick={handleDownloadDiagnosticReport}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs text-amber-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 font-medium"
          title="Tải về tệp báo cáo chẩn đoán toàn bộ hệ thống dưới dạng JSON"
        >
          <MorphIcon icon={Download} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>Xuất JSON</span>
        </button>

        <!-- Change Password Button -->
        <button
          type="button"
          onclick={() => { showChangePasswordModal = true; changePasswordError = null; changePasswordSuccess = null; }}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-white/80 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
          title="Thay đổi mật khẩu đăng nhập quản trị viên"
        >
          <MorphIcon icon={KeyRound} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>Đổi mật khẩu</span>
        </button>

        <!-- Logout Button -->
        <button
          type="button"
          onclick={handleLogout}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300 hover:text-rose-100 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Đăng xuất khỏi phiên quản trị viên"
        >
          <MorphIcon icon={LogOut} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Notification Banner -->
  {#if statusNotice}
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 transition-all duration-300"
      role="alert"
    >
      <div
        class="flex items-center justify-between p-3 rounded-2xl border backdrop-blur-md shadow-md text-xs sm:text-sm {statusNotice.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200' : statusNotice.type === 'warn' ? 'bg-amber-500/15 border-amber-500/30 text-amber-200' : 'bg-rose-500/15 border-rose-500/30 text-rose-200'}"
      >
        <div class="flex items-center gap-2">
          {#if statusNotice.type === 'success'}
            <MorphIcon icon={CheckCircle2} size={16} strokeWidth={2} spring="smooth" reducedMotion="user" />
          {:else if statusNotice.type === 'warn'}
            <MorphIcon icon={AlertTriangle} size={16} strokeWidth={2} spring="smooth" reducedMotion="user" />
          {:else}
            <MorphIcon icon={Info} size={16} strokeWidth={2} spring="smooth" reducedMotion="user" />
          {/if}
          <span>{statusNotice.text}</span>
        </div>
        <button
          type="button"
          onclick={() => { statusNotice = null; }}
          class="text-white/60 hover:text-white px-2 py-0.5 rounded cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  {/if}

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
    <!-- Top KPI Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Database & Storage Card -->
      <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
          <span class="flex items-center gap-1.5">
            <MorphIcon icon={Database} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>Lưu trữ CSDL</span>
          </span>
          <span class="text-amber-400 font-mono">IndexedDB</span>
        </div>
        <div class="mt-1">
          <div class="text-xl sm:text-2xl font-serif font-medium text-white">
            {formatBytes(telemetry?.storage.usageBytes || 0)}
          </div>
          <p class="text-xs text-white/50 mt-1 truncate">
            Hạn ngạch: {formatBytes(telemetry?.storage.quotaBytes || 0)}
            {#if telemetry?.storage.usagePercentage !== undefined}
              <span class="text-amber-300">({telemetry.storage.usagePercentage}%)</span>
            {/if}
          </p>
        </div>
        <!-- Progress bar -->
        <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            class="bg-amber-400 h-full rounded-full transition-all duration-500"
            style="width: {Math.max(2, Math.min(100, (telemetry?.storage.usagePercentage || 1)))}%"
          ></div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>{telemetry?.storage.entriesCount || 0} bài viết</span>
          <span>{telemetry?.storage.draftsCount ? '1 bản nháp' : '0 nháp'}</span>
        </div>
      </div>

      <!-- 2. Catalog & Assets Card -->
      <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
          <span class="flex items-center gap-1.5">
            <MorphIcon icon={Layers} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>Kho Nội Dung</span>
          </span>
          <span class="text-emerald-400 font-mono">100% Phê duyệt</span>
        </div>
        <div class="mt-1">
          <div class="text-xl sm:text-2xl font-serif font-medium text-white">
            {telemetry?.audio.totalTracks ?? ALL_HAVEN_AUDIO_TRACKS.length} <span class="text-sm font-sans text-white/60 font-normal">nhạc</span> • {telemetry?.visual.totalArtworks ?? CURATED_ARTWORKS.length} <span class="text-sm font-sans text-white/60 font-normal">tranh</span>
          </div>
          <p class="text-xs text-white/50 mt-1">
            {telemetry?.audio.pianoTracksCount ?? ALL_HAVEN_AUDIO_TRACKS.filter((t) => t.category === 'piano').length} Piano solo • {telemetry?.audio.ambientTracksCount ?? ALL_HAVEN_AUDIO_TRACKS.filter((t) => t.category === 'ambient').length} Ambient calm
          </p>
        </div>
        <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div class="bg-emerald-400 h-full rounded-full w-full"></div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>Bản quyền CC0 / Public Domain</span>
          <span class="text-emerald-300">Minh bạch</span>
        </div>
      </div>

      <!-- 3. WebGL2 Visual Pipeline Card -->
      <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
          <span class="flex items-center gap-1.5">
            <MorphIcon icon={Cpu} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>Đồ họa & Shader</span>
          </span>
          <span class="{telemetry?.visual.webgl2Supported ? 'text-cyan-400' : 'text-amber-400'} font-mono">
            {telemetry?.visual.webgl2Supported ? 'WebGL2' : 'Static Fallback'}
          </span>
        </div>
        <div class="mt-1">
          <div class="text-xl sm:text-2xl font-serif font-medium text-white truncate">
            {telemetry?.visual.webgl2Supported ? 'GPU Tăng tốc' : 'Ảnh tĩnh'}
          </div>
          <p class="text-xs text-white/50 mt-1 truncate" title={telemetry?.visual.rendererInfo || 'Hardware Renderer'}>
            {telemetry?.visual.rendererInfo || 'Hỗ trợ phần cứng'}
          </p>
        </div>
        <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div class="bg-cyan-400 h-full rounded-full w-full"></div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>DPR: {telemetry?.device.dpr || 1}x</span>
          <span>{telemetry?.device.viewport || 'N/A'}</span>
        </div>
      </div>

      <!-- 4. Real Performance Web Vitals Card -->
      <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
          <span class="flex items-center gap-1.5">
            <MorphIcon icon={Activity} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>Đo lường Tốc độ</span>
          </span>
          <span class="text-emerald-400 font-mono">Web Vitals</span>
        </div>
        <div class="mt-1">
          <div class="text-xl sm:text-2xl font-serif font-medium text-white">
            {telemetry?.performance.firstContentfulPaintMs !== undefined ? `${telemetry.performance.firstContentfulPaintMs} ms` : 'Đang đo...'}
          </div>
          <p class="text-xs text-white/50 mt-1">
            FCP (Sơn nội dung đầu tiên) • Tải trang: {telemetry?.performance.pageLoadTimeMs !== undefined ? `${telemetry.performance.pageLoadTimeMs}ms` : 'Đang đo...'}
          </p>
        </div>
        <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div class="bg-emerald-400 h-full rounded-full w-full"></div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>Tài nguyên: {telemetry?.performance.resourcesCount || 0}</span>
          <span class="{telemetry?.performance.firstContentfulPaintMs !== undefined && telemetry.performance.firstContentfulPaintMs < 1000 ? 'text-emerald-300' : 'text-amber-300'}">
            {telemetry?.performance.firstContentfulPaintMs !== undefined && telemetry.performance.firstContentfulPaintMs < 1000 ? 'Tốc độ A+' : 'Tiêu chuẩn'}
          </span>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
      <button
        type="button"
        onclick={() => { activeTab = 'overview'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'overview' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={BarChart2} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Hiệu Năng & Thiết Bị</span>
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'users'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'users' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Users} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Người Dùng & Đánh Giá</span>
        {#if (telemetry?.userAnalytics?.feedback.totalCount || 0) > 0}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-mono font-medium">
            {telemetry?.userAnalytics?.feedback.totalCount}
          </span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'database'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'database' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Database} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>CSDL & Nhật Ký</span>
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'catalog'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'catalog' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Music} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Thư Viện Media</span>
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'diagnostics'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'diagnostics' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Zap} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Chẩn Đoán & Nhật Ký Console</span>
      </button>
    </div>

    <!-- TAB 1: OVERVIEW & PERFORMANCE -->
    {#if activeTab === 'overview'}
      <div class="space-y-6">
        <!-- Navigation Timings Grid -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <h2 class="text-base sm:text-lg font-serif font-medium text-white mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Chi tiết Thời gian Tải trang (Navigation Timing API)</span>
          </h2>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <span class="text-xs text-white/50 block mb-1">Sơn Đầu Tiên (FP)</span>
              <span class="text-base sm:text-lg font-mono font-medium text-emerald-300">
                {telemetry?.performance.firstPaintMs !== undefined ? `${telemetry.performance.firstPaintMs} ms` : 'N/A'}
              </span>
              <span class="text-[10px] text-emerald-400/80 block mt-1">Tức thì</span>
            </div>

            <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <span class="text-xs text-white/50 block mb-1">Nội Dung Đầu (FCP)</span>
              <span class="text-base sm:text-lg font-mono font-medium text-emerald-300">
                {telemetry?.performance.firstContentfulPaintMs !== undefined ? `${telemetry.performance.firstContentfulPaintMs} ms` : 'N/A'}
              </span>
              <span class="text-[10px] text-emerald-400/80 block mt-1">Xuất sắc</span>
            </div>

            <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <span class="text-xs text-white/50 block mb-1">DOM Interactive</span>
              <span class="text-base sm:text-lg font-mono font-medium text-cyan-300">
                {telemetry?.performance.domInteractiveMs !== undefined ? `${telemetry.performance.domInteractiveMs} ms` : 'N/A'}
              </span>
              <span class="text-[10px] text-cyan-400/80 block mt-1">Sẵn sàng phản hồi</span>
            </div>

            <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <span class="text-xs text-white/50 block mb-1">DOM Complete</span>
              <span class="text-base sm:text-lg font-mono font-medium text-cyan-300">
                {telemetry?.performance.domCompleteMs !== undefined ? `${telemetry.performance.domCompleteMs} ms` : 'N/A'}
              </span>
              <span class="text-[10px] text-cyan-400/80 block mt-1">Đầy đủ cây DOM</span>
            </div>

            <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <span class="text-xs text-white/50 block mb-1">Tổng Thời Gian Tải</span>
              <span class="text-base sm:text-lg font-mono font-medium text-amber-300">
                {telemetry?.performance.pageLoadTimeMs !== undefined ? `${telemetry.performance.pageLoadTimeMs} ms` : 'N/A'}
              </span>
              <span class="text-[10px] text-amber-400/80 block mt-1">Hoàn tất</span>
            </div>

            <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <span class="text-xs text-white/50 block mb-1">Số Tài Nguyên</span>
              <span class="text-base sm:text-lg font-mono font-medium text-white/90">
                {telemetry?.performance.resourcesCount || 0}
              </span>
              <span class="text-[10px] text-white/40 block mt-1">Modules, Audio, Fonts</span>
            </div>
          </div>
        </div>

        <!-- Hardware & Device Environment -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
            <h2 class="text-base sm:text-lg font-serif font-medium text-white mb-4 flex items-center gap-2">
              <MorphIcon icon={Cpu} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>Phần Cứng & Môi Trường Thiết Bị</span>
            </h2>

            <div class="space-y-3 text-xs sm:text-sm">
              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">User Agent</span>
                <span class="font-mono text-white/80 max-w-[280px] sm:max-w-xs truncate" title={telemetry?.device.userAgent}>
                  {telemetry?.device.userAgent}
                </span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">Độ phân giải Màn hình</span>
                <span class="font-mono text-white">{telemetry?.device.screenResolution}</span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">Khung nhìn Trình duyệt (Viewport)</span>
                <span class="font-mono text-white">{telemetry?.device.viewport}</span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">Tỷ lệ Điểm ảnh (Device Pixel Ratio)</span>
                <span class="font-mono text-white">{telemetry?.device.dpr}x</span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">Số luồng CPU (Hardware Concurrency)</span>
                <span class="font-mono text-white">{telemetry?.device.hardwareConcurrency} luồng</span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">RAM Thiết bị Ước tính</span>
                <span class="font-mono text-white">
                  {telemetry?.device.deviceMemoryGb ? `${telemetry.device.deviceMemoryGb} GB` : 'Bảo mật/Không công khai'}
                </span>
              </div>

              <div class="flex items-center justify-between py-2">
                <span class="text-white/50">Tùy chọn Giảm Chuyển Động</span>
                <span class="font-mono text-white">
                  {telemetry?.device.prefersReducedMotion ? 'Đang bật (Reduced Motion)' : 'Bình thường (Smooth)'}
                </span>
              </div>
            </div>
          </div>

          <!-- Network & Engine Diagnostics -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
            <h2 class="text-base sm:text-lg font-serif font-medium text-white mb-4 flex items-center gap-2">
              <MorphIcon icon={Wifi} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>Kết Nối & Bộ Nhớ Trình Duyệt</span>
            </h2>

            <div class="space-y-3 text-xs sm:text-sm">
              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">Trạng thái Mạng</span>
                <span class="inline-flex items-center gap-1.5 font-medium {telemetry?.device.isOnline ? 'text-emerald-400' : 'text-rose-400'}">
                  <span class="w-2 h-2 rounded-full {telemetry?.device.isOnline ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
                  {telemetry?.device.isOnline ? 'Trực tuyến (Online)' : 'Ngoại tuyến (Offline)'}
                </span>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">Loại Kết nối (Network Effective Type)</span>
                <span class="font-mono text-white uppercase">{telemetry?.device.connectionType || 'Broadband / WiFi'}</span>
              </div>

              {#if telemetry?.performance.memory}
                <div class="flex items-center justify-between py-2 border-b border-white/5">
                  <span class="text-white/50">JS Heap Đang Sử Dụng</span>
                  <span class="font-mono text-white">{formatBytes(telemetry.performance.memory.usedJSHeapSize || 0)}</span>
                </div>

                <div class="flex items-center justify-between py-2 border-b border-white/5">
                  <span class="text-white/50">Tổng JS Heap Đã Cấp Phát</span>
                  <span class="font-mono text-white">{formatBytes(telemetry.performance.memory.totalJSHeapSize || 0)}</span>
                </div>

                <div class="flex items-center justify-between py-2 border-b border-white/5">
                  <span class="text-white/50">Giới Hạn JS Heap Tối Đa</span>
                  <span class="font-mono text-white">{formatBytes(telemetry.performance.memory.jsHeapSizeLimit || 0)}</span>
                </div>
              {/if}

              <!-- Weather Engine Status -->
              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-white/50">Cơ chế Dự báo Thời tiết</span>
                <span class="font-mono text-white">
                  {telemetry?.weather.detected ? `${telemetry.weather.descriptionVi} (${telemetry.weather.temperature}°C)` : 'Chế độ an toàn mặc định'}
                </span>
              </div>

              <div class="flex items-center justify-between py-2">
                <span class="text-white/50">Bộ nhớ Đệm Thời tiết</span>
                <span class="font-mono {telemetry?.weather.isCached ? 'text-emerald-300' : 'text-white/50'}">
                  {telemetry?.weather.isCached ? 'Cache Hit (Tiết kiệm băng thông)' : 'Trực tiếp'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB: USER ANALYTICS & FEEDBACK -->
    {#if activeTab === 'users'}
      <div class="space-y-6">
        <!-- 4 KPI Cards for Users -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 1. Lượt Truy Cập & Phiên -->
          <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
            <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
              <span class="flex items-center gap-1.5">
                <MorphIcon icon={Users} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Truy Cập & Phiên</span>
              </span>
              <span class="text-amber-400 font-mono">Lưu lượng</span>
            </div>
            <div class="mt-1">
              <div class="text-xl sm:text-2xl font-serif font-medium text-white">
                {telemetry?.userAnalytics?.visits.total || 0} <span class="text-xs font-sans text-white/50 font-normal">lượt</span>
              </div>
              <p class="text-xs text-white/50 mt-1 truncate">
                {telemetry?.userAnalytics?.visits.uniqueSessions || 0} phiên duy nhất
              </p>
            </div>
            <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
              <div class="bg-amber-400 h-full rounded-full w-full"></div>
            </div>
            <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>Hôm nay: <strong class="text-white font-mono">{telemetry?.userAnalytics?.visits.today || 0}</strong></span>
              <span>7 ngày qua: <strong class="text-amber-300 font-mono">{telemetry?.userAnalytics?.visits.thisWeek || 0}</strong></span>
            </div>
          </div>

          <!-- 2. Thời Lượng Trải Nghiệm -->
          <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
            <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
              <span class="flex items-center gap-1.5">
                <MorphIcon icon={Clock} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Thời Lượng Gắn Kết</span>
              </span>
              <span class="text-emerald-400 font-mono">Thời gian</span>
            </div>
            <div class="mt-1">
              <div class="text-xl sm:text-2xl font-serif font-medium text-white">
                {formatDuration(telemetry?.userAnalytics?.duration.totalDurationSeconds || 0)}
              </div>
              <p class="text-xs text-white/50 mt-1 truncate">
                Phiên này: {formatDuration(telemetry?.userAnalytics?.duration.currentSessionSeconds || 0)}
              </p>
            </div>
            <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
              <div class="bg-emerald-400 h-full rounded-full w-full"></div>
            </div>
            <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>TB/phiên: <strong class="text-white font-mono">{formatDuration(telemetry?.userAnalytics?.duration.averageSessionSeconds || 0)}</strong></span>
              <span>Nghe nhạc: <strong class="text-emerald-300 font-mono">{formatDuration(telemetry?.userAnalytics?.duration.musicListeningSeconds || 0)}</strong></span>
            </div>
          </div>

          <!-- 3. Viết Nhật Ký -->
          <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
            <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
              <span class="flex items-center gap-1.5">
                <MorphIcon icon={Database} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Hoạt Động Nhật Ký</span>
              </span>
              <span class="text-cyan-400 font-mono">Tự sự</span>
            </div>
            <div class="mt-1">
              <div class="text-xl sm:text-2xl font-serif font-medium text-white">
                {telemetry?.userAnalytics?.journaling.totalEntries || 0} <span class="text-xs font-sans text-white/50 font-normal">bài viết</span>
              </div>
              <p class="text-xs text-white/50 mt-1 truncate">
                {telemetry?.userAnalytics?.journaling.totalWords || 0} từ tích lũy
              </p>
            </div>
            <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
              <div class="bg-cyan-400 h-full rounded-full w-full"></div>
            </div>
            <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>Hôm nay: <strong class="text-white font-mono">{telemetry?.userAnalytics?.journaling.entriesToday || 0}</strong> bài</span>
              <span>TB: <strong class="text-cyan-300 font-mono">{telemetry?.userAnalytics?.journaling.averageWordsPerEntry || 0}</strong> từ/bài</span>
            </div>
          </div>

          <!-- 4. Đánh Giá & Cảm Nhận -->
          <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
            <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
              <span class="flex items-center gap-1.5">
                <MorphIcon icon={Star} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Đánh Giá Hài Lòng</span>
              </span>
              <span class="text-amber-400 font-mono">CSAT</span>
            </div>
            <div class="mt-1">
              {#if (telemetry?.userAnalytics?.feedback.totalCount || 0) > 0}
                <div class="text-xl sm:text-2xl font-serif font-medium text-white flex items-center gap-2">
                  <span>{telemetry?.userAnalytics?.feedback.averageRating?.toFixed(1)}</span>
                  <span class="text-amber-400 text-lg">★</span>
                  <span class="text-xs font-sans text-white/50 font-normal">/ 5.0</span>
                </div>
                <p class="text-xs text-white/50 mt-1 truncate">
                  {telemetry?.userAnalytics?.feedback.totalCount} lượt gửi cảm nhận thực tế
                </p>
              {:else}
                <div class="text-lg sm:text-xl font-serif font-medium text-white/50 mt-1">
                  Chưa có đánh giá
                </div>
                <p class="text-xs text-white/40 mt-1 truncate">
                  0 lượt phản hồi
                </p>
              {/if}
            </div>
            <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                class="bg-amber-400 h-full rounded-full transition-all duration-500"
                style="width: {(telemetry?.userAnalytics?.feedback.totalCount || 0) > 0 ? Math.round(((telemetry?.userAnalytics?.feedback.averageRating || 0) / 5) * 100) : 0}%"
              ></div>
            </div>
            <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              {#if (telemetry?.userAnalytics?.feedback.totalCount || 0) > 0}
                <span>5 sao: <strong class="text-white font-mono">{telemetry?.userAnalytics?.feedback.distribution[5] || 0}</strong></span>
                <span class="text-amber-300">
                  {Math.round(((telemetry?.userAnalytics?.feedback.distribution[5] || 0) / (telemetry?.userAnalytics?.feedback.totalCount || 1)) * 100)}% 5 sao
                </span>
              {:else}
                <span>5 sao: <strong class="text-white/40 font-mono">0</strong></span>
                <span class="text-white/40">Chưa có số liệu</span>
              {/if}
            </div>
          </div>
        </div>

        <!-- 2 Column Charts: 7-Day Visits & Rating Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left: 7-Day Visits History & Journal Moods -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-6">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Lịch Sử Lượt Truy Cập (7 Ngày Qua)</span>
                </h2>
                <span class="text-xs text-white/50 font-mono">
                  Tổng 7 ngày: {telemetry?.userAnalytics?.visits.thisWeek || 0}
                </span>
              </div>

              <!-- Bar Chart Representation -->
              <div class="space-y-2.5 pt-2">
                {#if (telemetry?.userAnalytics?.visits.dailyHistory || []).length === 0}
                  <div class="text-center py-6 text-white/40 text-xs">
                    Chưa có đủ dữ liệu lịch sử truy cập.
                  </div>
                {:else}
                  {@const maxVisits = Math.max(1, ...(telemetry?.userAnalytics?.visits.dailyHistory.map(d => d.count) || [1]))}
                  {#each (telemetry?.userAnalytics?.visits.dailyHistory || []) as day}
                    {@const pct = Math.round((day.count / maxVisits) * 100)}
                    <div class="flex items-center gap-3 text-xs">
                      <span class="w-20 font-mono text-white/60 truncate shrink-0">{day.date}</span>
                      <div class="flex-1 bg-white/5 rounded-full h-3 overflow-hidden border border-white/5 relative">
                        <div
                          class="bg-gradient-to-r from-amber-500/80 to-amber-300 h-full rounded-full transition-all duration-500"
                          style="width: {Math.max(4, pct)}%"
                        ></div>
                      </div>
                      <span class="w-12 text-right font-mono text-white/90 shrink-0 font-medium">
                        {day.count} <span class="text-[10px] text-white/40">lượt</span>
                      </span>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>

            <!-- Mood Breakdown mini section -->
            <div class="pt-4 border-t border-white/10">
              <h3 class="text-sm font-medium text-white mb-3 flex items-center justify-between">
                <span>Tâm Trạng Khi Viết Nhật Ký</span>
                <span class="text-xs text-white/40 font-normal">
                  {telemetry?.userAnalytics?.journaling.totalEntries || 0} bài
                </span>
              </h3>

              <div class="grid grid-cols-5 gap-2 text-center">
                {#each Object.entries(MOOD_META) as [key, meta]}
                  {@const count = telemetry?.userAnalytics?.journaling.moodBreakdown[key] || 0}
                  {@const total = telemetry?.userAnalytics?.journaling.totalEntries || 1}
                  {@const pct = total > 0 ? Math.round((count / total) * 100) : 0}
                  <div class="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center">
                    <span class="text-lg">{meta.icon}</span>
                    <span class="text-[11px] text-white/80 mt-1">{meta.label}</span>
                    <span class="text-xs font-mono font-medium text-amber-300 mt-0.5">{count}</span>
                    <span class="text-[10px] text-white/40">{pct}%</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Right: Star Rating Distribution & Satisfaction Metric -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-6">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Phân Bổ Xếp Hạng & Điểm Hài Lòng</span>
                </h2>
                {#if (telemetry?.userAnalytics?.feedback.totalCount || 0) > 0}
                  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-mono">
                    <span>Trung bình:</span>
                    <strong class="text-white">{telemetry?.userAnalytics?.feedback.averageRating?.toFixed(1)} ★</strong>
                  </div>
                {:else}
                  <span class="text-xs text-white/40 font-mono">0 đánh giá</span>
                {/if}
              </div>

              <!-- Rating 5 stars to 1 star bars -->
              <div class="space-y-3 mt-4">
                {#each [5, 4, 3, 2, 1] as star}
                  {@const count = telemetry?.userAnalytics?.feedback.distribution[star] || 0}
                  {@const total = telemetry?.userAnalytics?.feedback.totalCount || 0}
                  {@const pct = total > 0 ? Math.round((count / total) * 100) : 0}
                  <div class="flex items-center gap-3 text-xs">
                    <div class="w-14 flex items-center gap-1 shrink-0 font-mono text-white/80">
                      <span>{star}</span>
                      <span class="text-amber-400 text-xs">★</span>
                    </div>
                    <div class="flex-1 bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                      <div
                        class="h-full rounded-full transition-all duration-500 {star >= 4 ? 'bg-amber-400' : star === 3 ? 'bg-amber-500/70' : 'bg-stone-500'}"
                        style="width: {pct}%"
                      ></div>
                    </div>
                    <div class="w-16 text-right font-mono text-white/70 shrink-0">
                      {count} <span class="text-white/40">({pct}%)</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Satisfaction Index Box -->
            {#if (telemetry?.userAnalytics?.feedback.totalCount || 0) > 0}
              {@const positiveCount = (telemetry?.userAnalytics?.feedback.distribution[4] || 0) + (telemetry?.userAnalytics?.feedback.distribution[5] || 0)}
              {@const csatPct = Math.round((positiveCount / (telemetry?.userAnalytics?.feedback.totalCount || 1)) * 100)}
              <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                <div class="flex items-center gap-2 text-amber-300 font-medium">
                  <MorphIcon icon={Heart} size={15} strokeWidth={2} />
                  <span>Chỉ Số Hài Lòng Thực Tế (CSAT)</span>
                </div>
                <p class="text-white/80 leading-relaxed font-mono">
                  Tỷ lệ đánh giá tích cực (4-5 sao): <strong class="text-amber-300 text-sm">{csatPct}%</strong> ({positiveCount}/{telemetry?.userAnalytics?.feedback.totalCount} lượt đánh giá thực tế).
                </p>
                <div class="pt-1 flex items-center justify-between text-[11px] text-white/50 border-t border-white/10">
                  <span>Dữ liệu thu thập trực tiếp từ người dùng</span>
                  <span class="text-emerald-300 font-mono">Xác thực</span>
                </div>
              </div>
            {:else}
              <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs space-y-2">
                <div class="flex items-center gap-2 text-white/60 font-medium">
                  <MorphIcon icon={Heart} size={15} strokeWidth={2} />
                  <span>Chỉ Số Hài Lòng Thực Tế (CSAT)</span>
                </div>
                <p class="text-white/40 leading-relaxed">
                  Chưa có dữ liệu đánh giá từ người dùng. Khi người dùng bấm biểu tượng trái tim trên thanh điều hướng để gửi cảm nhận, điểm số CSAT sẽ được tính toán trực tiếp tại đây.
                </p>
                <div class="pt-1 flex items-center justify-between text-[11px] text-white/30 border-t border-white/5">
                  <span>Chờ phản hồi từ người dùng</span>
                  <span class="text-white/40 font-mono">0 lượt</span>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- User Feedback List Section -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                <MorphIcon icon={MessageSquare} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Cảm Nhận & Góp Ý Từ Người Dùng ({telemetry?.userAnalytics?.feedback.totalCount || 0})</span>
              </h2>
              <p class="text-xs text-white/50 mt-0.5">
                Các nhận xét được lưu trữ cục bộ, phản ánh chân thực cảm xúc và mong muốn của người dùng
              </p>
            </div>
          </div>

          {#if (telemetry?.userAnalytics?.feedback.recentFeedbacks || []).length === 0}
            <div class="text-center py-12 text-white/40 text-xs sm:text-sm">
              <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/30">
                <MorphIcon icon={MessageSquare} size={20} />
              </div>
              <p class="font-medium text-white/60">Chưa có cảm nhận nào được gửi từ người dùng.</p>
              <p class="text-[11px] text-white/40 mt-1 max-w-sm mx-auto">
                Khi người dùng trải nghiệm và gửi đánh giá từ biểu tượng Trái tim trên thanh điều hướng ở trang chính, các nhận xét thực tế sẽ hiển thị tại đây.
              </p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each (telemetry?.userAnalytics?.feedback.recentFeedbacks || []) as fb (fb.id)}
                <div class="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 transition-all flex flex-col justify-between gap-3 group">
                  <!-- Header: Stars + Category + Date -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <!-- Star rating representation -->
                      <div class="flex items-center text-amber-400 text-xs">
                        {#each Array(fb.rating) as _}
                          <span>★</span>
                        {/each}
                        {#each Array(5 - fb.rating) as _}
                          <span class="text-white/20">★</span>
                        {/each}
                      </div>

                      <!-- Category Badge -->
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-white/80">
                        <span>{FEEDBACK_CATEGORY_META[fb.category]?.icon || '✨'}</span>
                        <span>{FEEDBACK_CATEGORY_META[fb.category]?.label || 'Chung'}</span>
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="text-[11px] text-white/40 font-mono">
                        {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <!-- Delete feedback button -->
                      <button
                        type="button"
                        onclick={() => handleDeleteFeedback(fb.id)}
                        class="p-1 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Xóa phản hồi này"
                      >
                        <MorphIcon icon={Trash2} size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  <!-- Comment Body -->
                  <div class="text-xs sm:text-sm text-stone-300 font-serif italic leading-relaxed pl-3 border-l-2 border-amber-400/40">
                    "{fb.comment}"
                  </div>

                  <!-- Footer note -->
                  <div class="text-[10px] text-white/30 font-mono text-right">
                    ID: {fb.id.slice(0, 10)}...
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- TAB 2: DATABASE & JOURNAL -->
    {#if activeTab === 'database'}
      <div class="space-y-6">
        <!-- Storage Quota & Mood Distribution -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Mood Breakdown Card -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl lg:col-span-2">
            <h2 class="text-base sm:text-lg font-serif font-medium text-white mb-3 flex items-center justify-between">
              <span>Phân Bố Cảm Xúc Trong Nhật Ký</span>
              <span class="text-xs font-sans text-white/50 font-normal">
                Tổng: {telemetry?.storage.entriesCount || 0} bài viết
              </span>
            </h2>

            <div class="space-y-3 mt-4">
              {#each Object.entries(MOOD_META) as [key, meta]}
                {@const count = telemetry?.storage.moodBreakdown[key] || 0}
                {@const total = telemetry?.storage.entriesCount || 1}
                {@const pct = total > 0 ? Math.round((count / total) * 100) : 0}
                <div>
                  <div class="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                    <span class="flex items-center gap-2">
                      <span>{meta.icon}</span>
                      <span class="text-white/90">{meta.label}</span>
                    </span>
                    <span class="font-mono text-white/60">
                      {count} bài <span class="text-white/40">({pct}%)</span>
                    </span>
                  </div>
                  <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      class="{meta.color} h-full rounded-full transition-all duration-500"
                      style="width: {pct}%"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Quick Actions & Maintenance -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h2 class="text-base sm:text-lg font-serif font-medium text-white mb-2">Bảo Trì Cơ Sở Dữ Liệu</h2>
              <p class="text-xs text-white/60 leading-relaxed mb-4">
                Toàn bộ dữ liệu nằm an toàn trong trình duyệt (Local-First). Bạn có thể sao lưu hoặc dọn dẹp các bản ghi rác.
              </p>

              <div class="space-y-2.5">
                <div class="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                  <div class="flex items-center justify-between text-white/70">
                    <span>Số từ đã viết:</span>
                    <span class="font-mono font-medium text-white">{telemetry?.storage.totalWords || 0} từ</span>
                  </div>
                  <div class="flex items-center justify-between text-white/70 mt-1">
                    <span>Bài viết đã xóa tạm:</span>
                    <span class="font-mono font-medium text-amber-300">{telemetry?.storage.softDeletedCount || 0} bài</span>
                  </div>
                  <div class="flex items-center justify-between text-white/70 mt-1">
                    <span>Quyền lưu trữ bền vững:</span>
                    <span class="font-mono font-medium {telemetry?.storage.persisted ? 'text-emerald-300' : 'text-white/50'}">
                      {telemetry?.storage.persisted ? 'Đã cấp' : 'Chưa cấp'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-2 mt-4">
              <button
                type="button"
                onclick={handleExportBackup}
                class="w-full py-2.5 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <MorphIcon icon={Download} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Sao Lưu Toàn Bộ CSDL (JSON)</span>
              </button>

              <button
                type="button"
                onclick={handleRequestPersistence}
                class="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 hover:text-white text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MorphIcon icon={ShieldCheck} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Yêu Cầu Lưu Trữ Bền Vững</span>
              </button>

              <button
                type="button"
                onclick={handlePurgeDatabase}
                class="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-rose-100 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MorphIcon icon={Trash2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Dọn Dẹp Bài Viết Đã Xóa Tạm</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 3: MEDIA CATALOG -->
    {#if activeTab === 'catalog'}
      <div class="space-y-6">
        <!-- Audio Tracks Catalog -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                <MorphIcon icon={Music} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Kho Bản Nhạc & Không Gian Âm Thanh ({ALL_HAVEN_AUDIO_TRACKS.length})</span>
              </h2>
              <p class="text-xs text-white/50 mt-0.5">Tất cả các bản nhạc độc tấu Piano kinh điển và âm thanh thiền định được chọn lọc</p>
            </div>
            <button
              type="button"
              onclick={testAudioOscillator}
              class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <MorphIcon icon={Volume2} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>Thử nghiệm loa (440Hz)</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
              <thead class="text-xs font-mono text-white/40 uppercase border-b border-white/10">
                <tr>
                  <th class="py-3 px-3">Bản nhạc</th>
                  <th class="py-3 px-3">Thể loại</th>
                  <th class="py-3 px-3">Thời lượng</th>
                  <th class="py-3 px-3">Giấy phép</th>
                  <th class="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-light">
                {#each ALL_HAVEN_AUDIO_TRACKS as track (track.id)}
                  <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-3 px-3">
                      <div class="font-serif font-medium text-white/90">{track.title}</div>
                      <div class="text-xs text-white/50">{track.artist}</div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs {track.category === 'piano' ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' : 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20'}">
                        {track.category === 'piano' ? '🎹 Piano solo' : '🌿 Ambient calm'}
                      </span>
                    </td>
                    <td class="py-3 px-3 font-mono text-white/70">
                      {formatDuration(track.durationSeconds)}
                    </td>
                    <td class="py-3 px-3">
                      <span class="text-xs text-white/60 block truncate max-w-xs" title={track.license}>
                        {track.license}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right">
                      <div class="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onclick={() => toggleAudioPreview(track)}
                          class="px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 {activePreviewTrackId === track.id ? 'bg-amber-400 text-black font-medium shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white'}"
                          title={activePreviewTrackId === track.id ? 'Dừng phát' : 'Nghe thử trực tiếp'}
                        >
                          {#if activePreviewTrackId === track.id}
                            <MorphIcon icon={Pause} size={12} strokeWidth={2} spring="smooth" reducedMotion="user" />
                            <span>Dừng</span>
                          {:else}
                            <MorphIcon icon={Play} size={12} strokeWidth={2} spring="smooth" reducedMotion="user" />
                            <span>Nghe thử</span>
                          {/if}
                        </button>

                        {#if track.sourceUrl}
                          <a
                            href={track.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            title="Mở nguồn nhạc"
                          >
                            <MorphIcon icon={ExternalLink} size={13} strokeWidth={2} spring="smooth" reducedMotion="user" />
                          </a>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Curated Artworks Gallery -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="mb-4">
            <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
              <MorphIcon icon={Image} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>Bộ Sưu Tập Danh Họa Kinh Điển ({CURATED_ARTWORKS.length})</span>
            </h2>
            <p class="text-xs text-white/50 mt-0.5">Tất cả các tác phẩm đã kiểm chứng bản quyền Public Domain minh bạch</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {#each CURATED_ARTWORKS as artwork (artwork.id)}
              <div class="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/25 transition-all">
                <div class="aspect-[4/3] w-full overflow-hidden bg-black/40">
                  <img
                    src={artwork.src}
                    alt={artwork.title}
                    loading="lazy"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>
                <div class="p-3.5">
                  <h3 class="font-serif font-medium text-white text-sm truncate" title={artwork.title}>
                    {artwork.title}
                  </h3>
                  <p class="text-xs text-white/60 truncate mt-0.5">{artwork.artist}</p>
                  <div class="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
                    <span>{artwork.license}</span>
                    <a
                      href={artwork.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-amber-300/80 hover:text-amber-200 transition-colors"
                    >
                      Chi tiết ↗
                    </a>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 4: DIAGNOSTICS & SYSTEM EVENTS -->
    {#if activeTab === 'diagnostics'}
      <div class="space-y-6">
        <!-- Quick Diagnostic Actions Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <h3 class="text-sm font-medium text-white flex items-center gap-2 mb-1.5">
              <MorphIcon icon={Volume2} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>Kiểm Tra Web Audio</span>
            </h3>
            <p class="text-xs text-white/50 mb-3">Tạo sóng dao động âm tần 440Hz kiểm tra AudioContext.</p>
            <button
              type="button"
              onclick={testAudioOscillator}
              class="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
            >
              Phát Âm Thử Nghiệm
            </button>
          </div>

          <div class="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <h3 class="text-sm font-medium text-white flex items-center gap-2 mb-1.5">
              <MorphIcon icon={Trash2} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>Làm Sạch Cache PWA</span>
            </h3>
            <p class="text-xs text-white/50 mb-3">Xóa bộ đệm offline cũ để ép nạp tài nguyên mới nhất.</p>
            <button
              type="button"
              onclick={handleClearCaches}
              class="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
            >
              Xóa Bộ Đệm Caches
            </button>
          </div>

          <div class="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <h3 class="text-sm font-medium text-white flex items-center gap-2 mb-1.5">
              <MorphIcon icon={Download} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>Báo Cáo Kỹ Thuật JSON</span>
            </h3>
            <p class="text-xs text-white/50 mb-3">Tải báo cáo chi tiết mọi thông số cấu hình và bộ nhớ.</p>
            <button
              type="button"
              onclick={handleDownloadDiagnosticReport}
              class="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-xs font-medium transition-all cursor-pointer shadow-sm"
            >
              Tải Báo Cáo JSON
            </button>
          </div>
        </div>

        <!-- Live System Event Log Stream -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                <MorphIcon icon={Activity} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Nhật Ký Hoạt Động Thời Gian Thực (Live Event Stream)</span>
              </h2>
              <p class="text-xs text-white/50 mt-0.5">Ghi nhận các sự kiện hệ thống, khởi tạo CSDL, nạp âm thanh và thao tác người dùng</p>
            </div>

            <div class="flex items-center gap-2">
              <!-- Filter dropdown -->
              <select
                bind:value={eventLevelFilter}
                class="bg-white/5 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="all">Tất cả cấp độ</option>
                <option value="info">Thông tin (Info)</option>
                <option value="success">Thành công (Success)</option>
                <option value="warn">Cảnh báo (Warn)</option>
                <option value="error">Lỗi (Error)</option>
              </select>

              <button
                type="button"
                onclick={handleClearEvents}
                class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                Xóa nhật ký
              </button>
            </div>
          </div>

          <!-- Log items stream container -->
          <div class="bg-black/40 rounded-2xl border border-white/10 p-3 sm:p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-2">
            {#if filteredEvents.length === 0}
              <div class="text-white/40 text-center py-8">
                Chưa có sự kiện nào được ghi nhận.
              </div>
            {:else}
              {#each filteredEvents as evt (evt.id)}
                <div class="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <span class="text-white/40 select-none whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString('vi-VN')}
                  </span>

                  <!-- Level Badge -->
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider whitespace-nowrap {evt.level === 'success' ? 'bg-emerald-500/20 text-emerald-300' : evt.level === 'warn' ? 'bg-amber-500/20 text-amber-300' : evt.level === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'}"
                  >
                    {evt.level}
                  </span>

                  <!-- Category -->
                  <span class="text-white/50 text-[11px] uppercase tracking-wide whitespace-nowrap">
                    [{evt.category}]
                  </span>

                  <!-- Message -->
                  <span class="text-white/90 break-words flex-1">
                    {evt.message}
                  </span>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </main>

  <!-- Change Password Modal Dialog -->
  {#if showChangePasswordModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div class="bg-[#121318] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <MorphIcon icon={KeyRound} size={18} strokeWidth={2} />
            </div>
            <h3 class="text-base font-serif font-medium text-white">Đổi Mật Khẩu Quản Trị</h3>
          </div>
          <button
            type="button"
            onclick={() => { showChangePasswordModal = false; }}
            class="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white cursor-pointer transition-colors"
          >
            <MorphIcon icon={X} size={18} />
          </button>
        </div>

        {#if changePasswordError}
          <div class="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs">
            {changePasswordError}
          </div>
        {/if}

        {#if changePasswordSuccess}
          <div class="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <MorphIcon icon={CheckCircle2} size={16} />
            <span>{changePasswordSuccess}</span>
          </div>
        {/if}

        <form onsubmit={handleChangePassword} class="space-y-4 text-xs">
          <div class="space-y-1">
            <label for="current-pwd" class="text-white/70 block">Mật khẩu hiện tại</label>
            <input
              id="current-pwd"
              type="password"
              bind:value={currentPasswordInput}
              required
              class="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-white/30"
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>

          <div class="space-y-1">
            <label for="new-pwd" class="text-white/70 block">Mật khẩu mới (tối thiểu 6 ký tự)</label>
            <input
              id="new-pwd"
              type="password"
              bind:value={newPasswordInput}
              required
              minlength="6"
              class="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-white/30"
              placeholder="Nhập mật khẩu mới"
            />
          </div>

          <div class="space-y-1">
            <label for="confirm-pwd" class="text-white/70 block">Xác nhận mật khẩu mới</label>
            <input
              id="confirm-pwd"
              type="password"
              bind:value={confirmPasswordInput}
              required
              minlength="6"
              class="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-white/30"
              placeholder="Xác nhận lại mật khẩu mới"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => { showChangePasswordModal = false; }}
              class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={changePasswordLoading}
              class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-medium cursor-pointer transition-all disabled:opacity-50"
            >
              {changePasswordLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>
{/if}
