<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { JournalRepository } from '../../lib/db/repository';
  import { ALL_HAVEN_AUDIO_TRACKS, type HavenAudioTrack } from '../../lib/audio/ambient-catalog';
  import { ALL_HAVEN_ARTWORKS, type HavenArtwork } from '../../lib/visuals/pexels';
  import {
    getPexelsApiKey,
    setPexelsApiKey,
    hasPexelsApiKey,
    testPexelsApiKey,
    getPixabayApiKey,
    setPixabayApiKey,
    hasPixabayApiKey,
    testPixabayApiKey,
    getUnsplashApiKey,
    setUnsplashApiKey,
    hasUnsplashApiKey,
    testUnsplashApiKey,
    getProviderStatuses,
  } from '../../lib/visuals/multi-source';
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
    Sparkles,
    Search,
    FileText,
    Upload,
  } from 'lucide';

  let repo = $state<JournalRepository | null>(null);
  let telemetry = $state<SystemTelemetry | null>(null);
  let activeTab = $state<'overview' | 'users' | 'entries' | 'feedback' | 'catalog' | 'database' | 'diagnostics'>('overview');

  // Server Database & Telemetry State
  export interface ServerStatsData {
    analytics: {
      visits: { total: number; today: number; thisWeek: number };
      duration: { averageSeconds: number; totalSeconds: number };
      devices: { desktop: number; mobile: number; tablet: number };
      users: { total: number; activeToday: number };
      journal: { totalEntries: number; totalWords: number; moodBreakdown: Record<string, number> };
    };
    feedbackStats: {
      averageRating: number;
      totalCount: number;
      distribution: Record<number, number>;
    };
    dbStats: {
      filePath: string;
      fileSizeBytes: number;
      totalUsers: number;
      totalEntries: number;
      totalFeedbacks: number;
      totalSessions: number;
      version: number;
      lastModifiedMs: number;
    };
  }

  export interface ServerUserItem {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    status: 'active' | 'suspended';
    createdAt: number;
    lastLoginAt?: number;
    lastActiveAt?: number;
    entriesCount: number;
    totalWords: number;
  }

  export interface ServerEntryItem {
    id: string;
    userId: string;
    title?: string;
    body: string;
    mood?: string;
    wordCount: number;
    authorName: string;
    authorEmail: string;
    createdAt: number;
    updatedAt: number;
  }

  export interface ServerFeedbackItem {
    id: string;
    userId?: string | null;
    userName: string;
    userEmail?: string;
    rating: number;
    category: 'peace' | 'music' | 'visuals' | 'journal' | 'general';
    comment: string;
    device?: string;
    createdAt: number;
  }

  let serverStats = $state<ServerStatsData | null>(null);
  let serverUsers = $state<ServerUserItem[]>([]);
  let serverEntries = $state<ServerEntryItem[]>([]);
  let serverFeedbacks = $state<ServerFeedbackItem[]>([]);
  let isServerLoading = $state(false);

  // Filters for User, Entry, and Feedback tabs
  let userSearchQuery = $state('');
  let userStatusFilter = $state<'all' | 'active' | 'suspended'>('all');
  let entrySearchQuery = $state('');
  let feedbackCategoryFilter = $state<string>('all');

  let filteredUsers = $derived.by(() => {
    let list = serverUsers;
    if (userStatusFilter !== 'all') {
      list = list.filter((u) => u.status === userStatusFilter);
    }
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.trim().toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  });

  let filteredEntries = $derived.by(() => {
    let list = serverEntries;
    if (entrySearchQuery.trim()) {
      const q = entrySearchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          (e.title && e.title.toLowerCase().includes(q)) ||
          e.authorName.toLowerCase().includes(q) ||
          e.authorEmail.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q)
      );
    }
    return list;
  });

  let filteredFeedbacks = $derived.by(() => {
    let list = serverFeedbacks;
    if (feedbackCategoryFilter !== 'all') {
      list = list.filter((f) => f.category === feedbackCategoryFilter);
    }
    return list;
  });

  let feedbackCsat = $derived.by(() => {
    const totalCount = serverStats?.feedbackStats.totalCount || serverFeedbacks.length;
    const posCount =
      (serverStats?.feedbackStats.distribution[5] || 0) +
      (serverStats?.feedbackStats.distribution[4] || 0) ||
      serverFeedbacks.filter((f) => f.rating >= 4).length;
    const csatPercent = totalCount > 0 ? Math.round((posCount / totalCount) * 100) : 100;
    return { totalCount, posCount, csatPercent };
  });
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

  // Multi-Provider Photo API & Catalog Filter State
  let pexelsApiKeyInput = $state(getPexelsApiKey() || '');
  let isTestingPexelsKey = $state(false);
  let pexelsTestResult = $state<{ success: boolean; message: string } | null>(null);

  let pixabayApiKeyInput = $state(getPixabayApiKey() || '');
  let isTestingPixabayKey = $state(false);
  let pixabayTestResult = $state<{ success: boolean; message: string } | null>(null);

  let unsplashApiKeyInput = $state(getUnsplashApiKey() || '');
  let isTestingUnsplashKey = $state(false);
  let unsplashTestResult = $state<{ success: boolean; message: string } | null>(null);

  let activeProviderTab = $state<'pixabay' | 'unsplash' | 'pexels' | 'wikimedia'>('pixabay');
  let artworkCategoryFilter = $state<'all' | 'unsplash' | 'pixabay' | 'pexels' | 'classical'>('all');

  let filteredArtworks = $derived.by(() => {
    if (artworkCategoryFilter === 'unsplash') {
      return ALL_HAVEN_ARTWORKS.filter((a) => a.provider === 'unsplash' || a.id.startsWith('unsplash-'));
    }
    if (artworkCategoryFilter === 'pixabay') {
      return ALL_HAVEN_ARTWORKS.filter((a) => a.provider === 'pixabay' || a.id.startsWith('pixabay-'));
    }
    if (artworkCategoryFilter === 'pexels') {
      return ALL_HAVEN_ARTWORKS.filter((a) => a.provider === 'pexels' || a.id.startsWith('pexels'));
    }
    if (artworkCategoryFilter === 'classical') {
      return ALL_HAVEN_ARTWORKS.filter((a) => a.provider === 'classical' || (!a.id.startsWith('pexels') && !a.id.startsWith('unsplash') && !a.id.startsWith('pixabay')));
    }
    return ALL_HAVEN_ARTWORKS;
  });

  async function handleTestPexelsKey() {
    const key = pexelsApiKeyInput.trim();
    if (!key) {
      pexelsTestResult = {
        success: false,
        message: 'Vui lòng nhập API Key để kiểm tra kết nối.',
      };
      return;
    }
    isTestingPexelsKey = true;
    pexelsTestResult = null;
    try {
      const res = await testPexelsApiKey(key);
      if (res.valid) {
        pexelsTestResult = {
          success: true,
          message: `Kết nối Pexels API thành công! Đã xác thực API key hợp lệ (Mẫu ảnh: "${res.samplePhotographer || 'Pexels Contributor'}").`,
        };
      } else {
        pexelsTestResult = {
          success: false,
          message: res.error || 'API Key không hợp lệ hoặc bị từ chối bởi Pexels.',
        };
      }
    } catch (err: any) {
      pexelsTestResult = {
        success: false,
        message: err?.message || 'Không thể kết nối đến Pexels API. Vui lòng kiểm tra lại mạng.',
      };
    } finally {
      isTestingPexelsKey = false;
    }
  }

  function handleSavePexelsKey() {
    const key = pexelsApiKeyInput.trim();
    setPexelsApiKey(key);
    showNotice(key ? 'Đã lưu cấu hình Pexels API Key thành công' : 'Đã xóa API Key, trở về chế độ kho ảnh tĩnh', 'success');
    logSystemEvent({
      level: 'info',
      category: 'system',
      message: key ? 'Cập nhật cấu hình Pexels Live API Key' : 'Xóa cấu hình Pexels API Key',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('haven:photo-keys-changed'));
    }
  }

  function handleClearPexelsKey() {
    pexelsApiKeyInput = '';
    setPexelsApiKey('');
    pexelsTestResult = null;
    showNotice('Đã gỡ Pexels API Key', 'warn');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('haven:photo-keys-changed'));
    }
  }

  async function handleTestPixabayKey() {
    const key = pixabayApiKeyInput.trim();
    if (!key) {
      pixabayTestResult = {
        success: false,
        message: 'Vui lòng nhập API Key Pixabay để kiểm tra.',
      };
      return;
    }
    isTestingPixabayKey = true;
    pixabayTestResult = null;
    try {
      const res = await testPixabayApiKey(key);
      if (res.valid) {
        pixabayTestResult = {
          success: true,
          message: `Kết nối Pixabay API thành công! Mẫu ảnh: "${res.samplePhotographer || 'Pixabay Creator'}" (${res.totalResults || 0} kết quả).`,
        };
      } else {
        pixabayTestResult = {
          success: false,
          message: res.error || 'API Key Pixabay không hợp lệ.',
        };
      }
    } catch (err: any) {
      pixabayTestResult = {
        success: false,
        message: err?.message || 'Không thể kết nối đến Pixabay API.',
      };
    } finally {
      isTestingPixabayKey = false;
    }
  }

  function handleSavePixabayKey() {
    const key = pixabayApiKeyInput.trim();
    setPixabayApiKey(key);
    showNotice(key ? 'Đã lưu cấu hình Pixabay API Key thành công' : 'Đã gỡ Pixabay API Key', 'success');
    logSystemEvent({
      level: 'info',
      category: 'system',
      message: key ? 'Cập nhật cấu hình Pixabay Live API Key' : 'Xóa cấu hình Pixabay API Key',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('haven:photo-keys-changed'));
    }
  }

  function handleClearPixabayKey() {
    pixabayApiKeyInput = '';
    setPixabayApiKey('');
    pixabayTestResult = null;
    showNotice('Đã gỡ Pixabay API Key', 'warn');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('haven:photo-keys-changed'));
    }
  }

  async function handleTestUnsplashKey() {
    const key = unsplashApiKeyInput.trim();
    if (!key) {
      unsplashTestResult = {
        success: false,
        message: 'Vui lòng nhập Access Key Unsplash để kiểm tra.',
      };
      return;
    }
    isTestingUnsplashKey = true;
    unsplashTestResult = null;
    try {
      const res = await testUnsplashApiKey(key);
      if (res.valid) {
        unsplashTestResult = {
          success: true,
          message: `Kết nối Unsplash API thành công! Mẫu ảnh: "${res.samplePhotographer || 'Unsplash Creator'}" (${res.totalResults || 0} kết quả).`,
        };
      } else {
        unsplashTestResult = {
          success: false,
          message: res.error || 'Access Key Unsplash không hợp lệ.',
        };
      }
    } catch (err: any) {
      unsplashTestResult = {
        success: false,
        message: err?.message || 'Không thể kết nối đến Unsplash API.',
      };
    } finally {
      isTestingUnsplashKey = false;
    }
  }

  function handleSaveUnsplashKey() {
    const key = unsplashApiKeyInput.trim();
    setUnsplashApiKey(key);
    showNotice(key ? 'Đã lưu cấu hình Unsplash API Key thành công' : 'Đã gỡ Unsplash API Key', 'success');
    logSystemEvent({
      level: 'info',
      category: 'system',
      message: key ? 'Cập nhật cấu hình Unsplash Live API Key' : 'Xóa cấu hình Unsplash API Key',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('haven:photo-keys-changed'));
    }
  }

  function handleClearUnsplashKey() {
    unsplashApiKeyInput = '';
    setUnsplashApiKey('');
    unsplashTestResult = null;
    showNotice('Đã gỡ Unsplash API Key', 'warn');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('haven:photo-keys-changed'));
    }
  }

  function showNotice(text: string, type: 'success' | 'warn' | 'error' = 'success') {
    statusNotice = { text, type };
    if (noticeTimeout) clearTimeout(noticeTimeout);
    noticeTimeout = setTimeout(() => {
      statusNotice = null;
    }, 4000);
  }

  function getAdminToken(): string {
    return (typeof window !== 'undefined' && window.sessionStorage?.getItem('haven_admin_token')) || '';
  }

  async function fetchServerStats() {
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          serverStats = data;
        }
      }
    } catch (e) {
      console.warn('Lỗi tải server stats:', e);
    }
  }

  async function fetchServerUsers() {
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          serverUsers = data.users;
        }
      }
    } catch (e) {
      console.warn('Lỗi tải server users:', e);
    }
  }

  async function fetchServerEntries() {
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/entries', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          serverEntries = data.entries;
        }
      }
    } catch (e) {
      console.warn('Lỗi tải server entries:', e);
    }
  }

  async function fetchServerFeedbacks() {
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/feedback', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          serverFeedbacks = data.feedbacks;
        }
      }
    } catch (e) {
      console.warn('Lỗi tải server feedbacks:', e);
    }
  }

  async function refreshAllServerData() {
    isServerLoading = true;
    await Promise.allSettled([
      fetchServerStats(),
      fetchServerUsers(),
      fetchServerEntries(),
      fetchServerFeedbacks(),
    ]);
    isServerLoading = false;
  }

  async function handleToggleUserStatus(u: ServerUserItem) {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    const actionText = newStatus === 'suspended' ? 'khóa' : 'kích hoạt lại';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản "${u.email}"?`)) return;

    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: u.id, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        serverUsers = data.users;
        showNotice(`Đã ${actionText} tài khoản thành công!`, 'success');
      } else {
        showNotice(data.error || 'Thao tác không thành công', 'error');
      }
    } catch {
      showNotice('Lỗi kết nối máy chủ', 'error');
    }
  }

  async function handleResetUserPassword(u: ServerUserItem) {
    const newPass = prompt(`Nhập mật khẩu mới cho tài khoản "${u.email}" (tối thiểu 6 ký tự):`);
    if (!newPass) return;
    if (newPass.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: u.id, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        serverUsers = data.users;
        showNotice(`Đã đặt lại mật khẩu cho "${u.email}" thành công!`, 'success');
      } else {
        showNotice(data.error || 'Thao tác không thành công', 'error');
      }
    } catch {
      showNotice('Lỗi kết nối máy chủ', 'error');
    }
  }

  async function handleDeleteUser(u: ServerUserItem) {
    if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa tài khoản "${u.email}"? Toàn bộ bài viết của người dùng này trên server cũng sẽ bị xóa vĩnh viễn!`)) return;

    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        serverUsers = data.users;
        await fetchServerEntries();
        await fetchServerStats();
        showNotice(`Đã xóa tài khoản "${u.email}" khỏi server.`, 'warn');
      } else {
        showNotice(data.error || 'Không thể xóa tài khoản', 'error');
      }
    } catch {
      showNotice('Lỗi kết nối máy chủ', 'error');
    }
  }

  async function handleDeleteEntry(e: ServerEntryItem) {
    if (!confirm(`Xóa bài viết "${e.title || 'Không tiêu đề'}" khỏi máy chủ?`)) return;

    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/entries', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: e.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        serverEntries = serverEntries.filter((item) => item.id !== e.id);
        await fetchServerStats();
        showNotice('Đã xóa bài viết khỏi server', 'warn');
      } else {
        showNotice(data.error || 'Không thể xóa bài viết', 'error');
      }
    } catch {
      showNotice('Lỗi kết nối máy chủ', 'error');
    }
  }

  async function handlePurgeServerDeletedEntries() {
    if (!confirm('Dọn dẹp và xóa hoàn toàn tất cả bài viết đã xóa mềm trên máy chủ?')) return;
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/entries', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ purge: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchServerEntries();
        await fetchServerStats();
        showNotice(`Đã dọn dẹp ${data.purgedCount || 0} bản ghi rác!`, 'success');
      }
    } catch {
      showNotice('Lỗi kết nối máy chủ', 'error');
    }
  }

  async function handleDeleteFeedback(fb: ServerFeedbackItem) {
    if (!confirm(`Xóa đánh giá của "${fb.userName}"?`)) return;

    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: fb.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        serverFeedbacks = data.feedbacks;
        await fetchServerStats();
        showNotice('Đã xóa đánh giá', 'warn');
      } else {
        showNotice(data.error || 'Không thể xóa đánh giá', 'error');
      }
    } catch {
      showNotice('Lỗi kết nối máy chủ', 'error');
    }
  }

  async function handleDownloadServerDbBackup() {
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/backup', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        showNotice('Không thể xuất sao lưu máy chủ', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `havenart-server-database-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice('Đã tải xuống bản sao lưu CSDL Server thành công!', 'success');
    } catch {
      showNotice('Lỗi kết nối tải sao lưu', 'error');
    }
  }

  let dbFileInputRef: HTMLInputElement | null = null;
  async function handleUploadServerDbBackup(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!confirm(`CẢNH BÁO: Nhập file "${file.name}" sẽ cập nhật và hợp nhất dữ liệu vào Cơ sở dữ liệu Server hiện tại. Bạn có muốn tiếp tục?`)) {
      target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const token = getAdminToken();

      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await refreshAllServerData();
        showNotice(data.message || 'Phục hồi CSDL thành công!', 'success');
      } else {
        showNotice(data.error || 'Phục hồi thất bại', 'error');
      }
    } catch (err: any) {
      showNotice(`Lỗi phân tích file: ${err?.message || err}`, 'error');
    } finally {
      target.value = '';
    }
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

    await Promise.allSettled([
      refreshTelemetry(),
      refreshAllServerData(),
    ]);

    logSystemEvent({
      level: 'info',
      category: 'system',
      message: 'Mở trang Bảng điều khiển Quản trị Haven Art (Server Connected)',
    });

    if (!timerId) {
      timerId = setInterval(() => {
        if (autoRefresh && isAuthenticated) {
          refreshTelemetry();
          fetchServerStats();
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
    <!-- Top KPI Cards Grid (Real Server Telemetry) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Server Users Card -->
      <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
          <span class="flex items-center gap-1.5">
            <MorphIcon icon={Users} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>Người Dùng Server</span>
          </span>
          <span class="text-amber-400 font-mono">Tài khoản</span>
        </div>
        <div class="mt-1">
          <div class="text-xl sm:text-2xl font-serif font-medium text-white">
            {serverStats?.analytics.users.total ?? serverUsers.length} <span class="text-xs sm:text-sm font-sans text-white/60 font-normal">thành viên</span>
          </div>
          <p class="text-xs text-white/50 mt-1 truncate">
            Hôm nay hoạt động: <span class="text-emerald-300 font-medium">{serverStats?.analytics.users.activeToday || 0}</span> người dùng
          </p>
        </div>
        <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            class="bg-amber-400 h-full rounded-full transition-all duration-500"
            style="width: {serverUsers.length > 0 ? Math.min(100, Math.round(((serverStats?.analytics.users.activeToday || 1) / serverUsers.length) * 100)) : 100}%"
          ></div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>Hoạt động: {serverUsers.filter(u => u.status === 'active').length}</span>
          <span>Tạm khóa: {serverUsers.filter(u => u.status === 'suspended').length}</span>
        </div>
      </div>

      <!-- 2. Server Journal Entries Card -->
      <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
          <span class="flex items-center gap-1.5">
            <MorphIcon icon={FileText} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>Bài Viết Nhật Ký</span>
          </span>
          <span class="text-emerald-400 font-mono">Đồng bộ Cloud</span>
        </div>
        <div class="mt-1">
          <div class="text-xl sm:text-2xl font-serif font-medium text-white">
            {serverStats?.analytics.journal.totalEntries ?? serverEntries.length} <span class="text-xs sm:text-sm font-sans text-white/60 font-normal">bài viết</span>
          </div>
          <p class="text-xs text-white/50 mt-1">
            Tổng cộng: <span class="text-emerald-300 font-medium">{(serverStats?.analytics.journal.totalWords ?? 0).toLocaleString()}</span> từ đã lưu
          </p>
        </div>
        <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div class="bg-emerald-400 h-full rounded-full w-full"></div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>Trung bình: {serverEntries.length > 0 ? Math.round((serverStats?.analytics.journal.totalWords || 0) / serverEntries.length) : 0} từ/bài</span>
          <span class="text-emerald-300">An toàn</span>
        </div>
      </div>

      <!-- 3. Traffic & Sessions Duration Card -->
      <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
          <span class="flex items-center gap-1.5">
            <MorphIcon icon={Clock} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>Lưu Lượng & Thời Lượng</span>
          </span>
          <span class="text-cyan-400 font-mono">Phiên thực</span>
        </div>
        <div class="mt-1">
          <div class="text-xl sm:text-2xl font-serif font-medium text-white truncate">
            {formatDuration(serverStats?.analytics.duration.averageSeconds || 0)}
          </div>
          <p class="text-xs text-white/50 mt-1 truncate">
            Thời lượng TB • Tổng: <span class="text-cyan-300 font-medium">{serverStats?.analytics.visits.total ?? 0}</span> lượt ghé thăm
          </p>
        </div>
        <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div class="bg-cyan-400 h-full rounded-full w-full"></div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>Hôm nay: {serverStats?.analytics.visits.today || 0}</span>
          <span>Tuần này: {serverStats?.analytics.visits.thisWeek || 0}</span>
        </div>
      </div>

      <!-- 4. Real User Reviews & Feedback Card -->
      <div class="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200">
        <div class="flex items-center justify-between text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
          <span class="flex items-center gap-1.5">
            <MorphIcon icon={Star} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
            <span>Đánh Giá Người Dùng</span>
          </span>
          <span class="text-amber-300 font-mono">Thực tế</span>
        </div>
        <div class="mt-1">
          <div class="text-xl sm:text-2xl font-serif font-medium text-white flex items-center gap-2">
            <span>{serverStats?.feedbackStats.averageRating || 5.0}</span>
            <span class="text-amber-400 text-lg">★</span>
            <span class="text-xs sm:text-sm font-sans text-white/60 font-normal">({serverStats?.feedbackStats.totalCount ?? serverFeedbacks.length} lượt)</span>
          </div>
          <p class="text-xs text-white/50 mt-1">
            Đánh giá 5★: <span class="text-amber-300 font-medium">{serverStats?.feedbackStats.distribution[5] || 0}</span> • 4★: <span class="text-amber-300 font-medium">{serverStats?.feedbackStats.distribution[4] || 0}</span>
          </p>
        </div>
        <div class="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            class="bg-amber-400 h-full rounded-full"
            style="width: {Math.round(((serverStats?.feedbackStats.averageRating || 5.0) / 5) * 100)}%"
          ></div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>Sự an yên & tĩnh lặng</span>
          <span class="text-amber-300">Tích cực</span>
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
        <span>Tổng Quan & Thiết Bị</span>
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'users'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'users' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Users} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Quản Lý Người Dùng</span>
        {#if serverUsers.length > 0}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-mono font-medium">
            {serverUsers.length}
          </span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'entries'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'entries' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={FileText} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Bài Viết Server</span>
        {#if serverEntries.length > 0}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-mono font-medium">
            {serverEntries.length}
          </span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'feedback'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'feedback' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Star} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Đánh Giá & Nhận Xét</span>
        {#if serverFeedbacks.length > 0}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-mono font-medium">
            {serverFeedbacks.length}
          </span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'catalog'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'catalog' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Image} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Kho Ảnh Đa Nguồn (75)</span>
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'database'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'database' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Database} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Quản Trị CSDL Server</span>
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'diagnostics'; }}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap {activeTab === 'diagnostics' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}"
      >
        <MorphIcon icon={Zap} size={15} strokeWidth={2} spring="smooth" reducedMotion="user" />
        <span>Chẩn Đoán & Nhật Ký</span>
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

    <!-- TAB 2: USER MANAGEMENT (SERVER ACCOUNTS) -->
    {#if activeTab === 'users'}
      <div class="space-y-6">
        <!-- Top Toolbar & Stats -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                <MorphIcon icon={Users} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Quản Lý Tài Khoản Người Dùng ({serverUsers.length})</span>
              </h2>
              <p class="text-xs text-white/50 mt-0.5">
                Danh sách người dùng đã đăng ký tài khoản trên máy chủ Haven Art (được lưu tại CSDL server)
              </p>
            </div>

            <!-- Action Controls -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={refreshAllServerData}
                disabled={isServerLoading}
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                title="Tải lại danh sách người dùng từ máy chủ"
              >
                <MorphIcon icon={RefreshCw} size={13} strokeWidth={2} spin={isServerLoading} />
                <span>{isServerLoading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            </div>
          </div>

          <!-- Quick Metrics Banner -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span class="text-[11px] text-white/50 block">Tổng Người Dùng</span>
              <span class="text-xl font-serif font-medium text-white">{serverUsers.length}</span>
              <span class="text-[10px] text-white/40 block mt-0.5">Tài khoản server</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span class="text-[11px] text-emerald-300 block">Đang Hoạt Động</span>
              <span class="text-xl font-serif font-medium text-emerald-300">
                {serverUsers.filter((u) => u.status === 'active').length}
              </span>
              <span class="text-[10px] text-emerald-400/60 block mt-0.5">Bình thường</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <span class="text-[11px] text-rose-300 block">Đã Bị Khóa</span>
              <span class="text-xl font-serif font-medium text-rose-300">
                {serverUsers.filter((u) => u.status === 'suspended').length}
              </span>
              <span class="text-[10px] text-rose-400/60 block mt-0.5">Tạm khóa</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span class="text-[11px] text-amber-300 block">Quản Trị Viên</span>
              <span class="text-xl font-serif font-medium text-amber-300">
                {serverUsers.filter((u) => u.role === 'admin').length}
              </span>
              <span class="text-[10px] text-amber-400/60 block mt-0.5">Toàn quyền</span>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div class="relative flex-1 min-w-[240px] max-w-md">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                <MorphIcon icon={Search} size={14} />
              </div>
              <input
                type="text"
                bind:value={userSearchQuery}
                placeholder="Tìm theo tên hoặc email người dùng..."
                class="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <!-- Status Filter Pills -->
            <div class="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                type="button"
                onclick={() => { userStatusFilter = 'all'; }}
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {userStatusFilter === 'all' ? 'bg-amber-400 text-stone-900 font-medium' : 'text-white/60 hover:text-white'}"
              >
                Tất cả ({serverUsers.length})
              </button>
              <button
                type="button"
                onclick={() => { userStatusFilter = 'active'; }}
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {userStatusFilter === 'active' ? 'bg-amber-400 text-stone-900 font-medium' : 'text-white/60 hover:text-white'}"
              >
                Hoạt động
              </button>
              <button
                type="button"
                onclick={() => { userStatusFilter = 'suspended'; }}
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer {userStatusFilter === 'suspended' ? 'bg-amber-400 text-stone-900 font-medium' : 'text-white/60 hover:text-white'}"
              >
                Bị khóa
              </button>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden shadow-lg">
          {#if filteredUsers.length === 0}
            <div class="text-center py-16 px-4">
              <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/40">
                <MorphIcon icon={Users} size={22} />
              </div>
              <p class="font-medium text-white/70 text-sm">Không tìm thấy người dùng phù hợp.</p>
              <p class="text-xs text-white/40 mt-1">Hãy thử tìm với từ khóa hoặc bộ lọc trạng thái khác.</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider text-[11px]">
                    <th class="py-3.5 px-4 font-medium">Người Dùng</th>
                    <th class="py-3.5 px-4 font-medium">Vai Trò</th>
                    <th class="py-3.5 px-4 font-medium">Trạng Thái</th>
                    <th class="py-3.5 px-4 font-medium">Bài Viết / Số Từ</th>
                    <th class="py-3.5 px-4 font-medium">Ngày Đăng Ký</th>
                    <th class="py-3.5 px-4 font-medium">Đăng Nhập Cuối</th>
                    <th class="py-3.5 px-4 font-medium text-right">Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  {#each filteredUsers as u (u.id)}
                    <tr class="hover:bg-white/[0.02] transition-colors">
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center font-serif text-amber-300 font-medium text-xs">
                            {u.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div class="font-medium text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {#if u.email === 'admin@havenart.space' || u.id === 'user_root_admin'}
                                <span class="px-1.5 py-0.2 rounded text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30">Root</span>
                              {/if}
                            </div>
                            <div class="text-[11px] text-white/50 font-mono mt-0.5">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-4">
                        {#if u.role === 'admin'}
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-400/15 border border-amber-400/30 text-amber-300 font-medium">
                            <MorphIcon icon={ShieldCheck} size={11} />
                            <span>Quản trị viên</span>
                          </span>
                        {:else}
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                            <span>Thành viên</span>
                          </span>
                        {/if}
                      </td>
                      <td class="py-3.5 px-4">
                        {#if u.status === 'active'}
                          <span class="inline-flex items-center gap-1.5 text-emerald-300">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Hoạt động</span>
                          </span>
                        {:else}
                          <span class="inline-flex items-center gap-1.5 text-rose-300">
                            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            <span>Đã khóa</span>
                          </span>
                        {/if}
                      </td>
                      <td class="py-3.5 px-4 font-mono text-white/80">
                        <span class="font-medium text-white">{u.entriesCount}</span> bài
                        <span class="text-white/40">({u.totalWords} từ)</span>
                      </td>
                      <td class="py-3.5 px-4 font-mono text-white/60">
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td class="py-3.5 px-4 font-mono text-white/60">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <!-- Toggle Status (Lock / Unlock) -->
                          {#if u.email !== 'admin@havenart.space' && u.id !== 'user_root_admin'}
                            <button
                              type="button"
                              onclick={() => handleToggleUserStatus(u)}
                              class="p-1.5 rounded-lg transition-colors cursor-pointer {u.status === 'active' ? 'text-white/40 hover:text-amber-300 hover:bg-amber-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}"
                              title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              <MorphIcon icon={u.status === 'active' ? Lock : ShieldCheck} size={14} />
                            </button>
                          {/if}

                          <!-- Reset Password -->
                          <button
                            type="button"
                            onclick={() => handleResetUserPassword(u)}
                            class="p-1.5 rounded-lg text-white/40 hover:text-cyan-300 hover:bg-cyan-400/10 transition-colors cursor-pointer"
                            title="Đặt lại mật khẩu cho tài khoản"
                          >
                            <MorphIcon icon={KeyRound} size={14} />
                          </button>

                          <!-- Delete User -->
                          {#if u.email !== 'admin@havenart.space' && u.id !== 'user_root_admin'}
                            <button
                              type="button"
                              onclick={() => handleDeleteUser(u)}
                              class="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-400/10 transition-colors cursor-pointer"
                              title="Xóa vĩnh viễn tài khoản và bài viết trên máy chủ"
                            >
                              <MorphIcon icon={Trash2} size={14} />
                            </button>
                          {/if}
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- TAB 3: SERVER JOURNAL ENTRIES -->
    {#if activeTab === 'entries'}
      <div class="space-y-6">
        <!-- Top Toolbar & Stats -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                <MorphIcon icon={FileText} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Quản Lý Bài Viết Server ({serverEntries.length})</span>
              </h2>
              <p class="text-xs text-white/50 mt-0.5">
                Các bài viết được lưu trữ và đồng bộ hóa an toàn trên máy chủ của Haven Art
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={handlePurgeServerDeletedEntries}
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs text-rose-300 hover:text-rose-200 transition-all cursor-pointer"
                title="Xóa vĩnh viễn các bài viết người dùng đã xóa mềm"
              >
                <MorphIcon icon={Trash2} size={13} strokeWidth={1.75} />
                <span>Dọn Rác Máy Chủ</span>
              </button>

              <button
                type="button"
                onclick={fetchServerEntries}
                disabled={isServerLoading}
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <MorphIcon icon={RefreshCw} size={13} strokeWidth={2} spin={isServerLoading} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          <!-- Quick Metrics Banner -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span class="text-[11px] text-white/50 block">Tổng Bài Viết Server</span>
              <span class="text-xl font-serif font-medium text-white">{serverEntries.length}</span>
              <span class="text-[10px] text-white/40 block mt-0.5">Đã đồng bộ</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <span class="text-[11px] text-cyan-300 block">Tổng Số Từ</span>
              <span class="text-xl font-serif font-medium text-cyan-300">
                {serverEntries.reduce((acc, e) => acc + (e.wordCount || 0), 0).toLocaleString('vi-VN')}
              </span>
              <span class="text-[10px] text-cyan-400/60 block mt-0.5">Tích lũy</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span class="text-[11px] text-amber-300 block">Số Tác Giả</span>
              <span class="text-xl font-serif font-medium text-amber-300">
                {new Set(serverEntries.map((e) => e.userId)).size}
              </span>
              <span class="text-[10px] text-amber-400/60 block mt-0.5">Người viết</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span class="text-[11px] text-emerald-300 block">TB Từ / Bài</span>
              <span class="text-xl font-serif font-medium text-emerald-300">
                {serverEntries.length > 0 ? Math.round(serverEntries.reduce((acc, e) => acc + (e.wordCount || 0), 0) / serverEntries.length) : 0}
              </span>
              <span class="text-[10px] text-emerald-400/60 block mt-0.5">Độ dài trung bình</span>
            </div>
          </div>

          <!-- Search Bar -->
          <div class="relative max-w-md pt-4 border-t border-white/10">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40 pt-4">
              <MorphIcon icon={Search} size={14} />
            </div>
            <input
              type="text"
              bind:value={entrySearchQuery}
              placeholder="Tìm theo tiêu đề, tác giả, nội dung bài viết..."
              class="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        <!-- Entries Table -->
        <div class="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden shadow-lg">
          {#if filteredEntries.length === 0}
            <div class="text-center py-16 px-4">
              <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/40">
                <MorphIcon icon={FileText} size={22} />
              </div>
              <p class="font-medium text-white/70 text-sm">Không có bài viết nào trên máy chủ.</p>
              <p class="text-xs text-white/40 mt-1">Khi người dùng đăng nhập và lưu nhật ký, các bài viết sẽ được đồng bộ tại đây.</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider text-[11px]">
                    <th class="py-3.5 px-4 font-medium">Tiêu Đề & Nội Dung</th>
                    <th class="py-3.5 px-4 font-medium">Tác Giả</th>
                    <th class="py-3.5 px-4 font-medium">Tâm Trạng</th>
                    <th class="py-3.5 px-4 font-medium">Số Từ</th>
                    <th class="py-3.5 px-4 font-medium">Thời Gian Lưu</th>
                    <th class="py-3.5 px-4 font-medium text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  {#each filteredEntries as e (e.id)}
                    <tr class="hover:bg-white/[0.02] transition-colors">
                      <td class="py-3.5 px-4 max-w-sm">
                        <div class="font-medium text-white line-clamp-1">
                          {e.title || 'Không tiêu đề'}
                        </div>
                        <div class="text-[11px] text-white/50 line-clamp-2 mt-0.5 font-serif italic">
                          {e.body}
                        </div>
                      </td>
                      <td class="py-3.5 px-4">
                        <div class="font-medium text-white">{e.authorName}</div>
                        <div class="text-[11px] text-white/40 font-mono mt-0.5">{e.authorEmail}</div>
                      </td>
                      <td class="py-3.5 px-4">
                        {#if e.mood && MOOD_META[e.mood]}
                          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-white/80">
                            <span>{MOOD_META[e.mood].icon}</span>
                            <span>{MOOD_META[e.mood].label}</span>
                          </span>
                        {:else}
                          <span class="text-white/40 text-[11px]">—</span>
                        {/if}
                      </td>
                      <td class="py-3.5 px-4 font-mono text-cyan-300">
                        {e.wordCount} từ
                      </td>
                      <td class="py-3.5 px-4 font-mono text-white/60">
                        {new Date(e.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onclick={() => handleDeleteEntry(e)}
                          class="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-400/10 transition-colors cursor-pointer"
                          title="Xóa bài viết này khỏi máy chủ"
                        >
                          <MorphIcon icon={Trash2} size={14} />
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- TAB 4: REAL USER FEEDBACK & REVIEWS -->
    {#if activeTab === 'feedback'}
      <div class="space-y-6">
        <!-- Top Analytics & Feedback Summary -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Rating Breakdown Card -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl lg:col-span-2 space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                  <MorphIcon icon={Star} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                  <span>Xếp Hạng & Điểm Hài Lòng (CSAT)</span>
                </h2>
                <p class="text-xs text-white/50 mt-0.5">
                  Dữ liệu phản hồi thực tế từ người dùng được gửi và lưu trữ tập trung trên máy chủ
                </p>
              </div>

              <button
                type="button"
                onclick={fetchServerFeedbacks}
                disabled={isServerLoading}
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <MorphIcon icon={RefreshCw} size={13} strokeWidth={2} spin={isServerLoading} />
                <span>Làm mới</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <!-- Big Rating Display -->
              <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-center items-center text-center">
                <span class="text-3xl sm:text-4xl font-serif font-medium text-amber-300">
                  {serverStats?.feedbackStats.averageRating?.toFixed(1) || '5.0'}
                </span>
                <div class="flex items-center text-amber-400 text-sm mt-1">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <span class="text-xs text-white/60 mt-1 font-mono">
                  {serverStats?.feedbackStats.totalCount ?? serverFeedbacks.length} lượt đánh giá thực tế
                </span>
              </div>

              <!-- Star Distribution 5 to 1 -->
              <div class="sm:col-span-2 space-y-2 flex flex-col justify-center">
                {#each [5, 4, 3, 2, 1] as star}
                  {@const total = serverStats?.feedbackStats.totalCount || (serverFeedbacks.length || 1)}
                  {@const count = serverStats?.feedbackStats.distribution[star] || serverFeedbacks.filter((f) => f.rating === star).length}
                  {@const pct = total > 0 ? Math.round((count / total) * 100) : 0}
                  <div class="flex items-center gap-2.5 text-xs">
                    <span class="w-12 font-mono text-white/70 flex items-center gap-1">
                      <span>{star}</span><span class="text-amber-400 text-xs">★</span>
                    </span>
                    <div class="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden border border-white/5">
                      <div
                        class="h-full rounded-full transition-all duration-500 {star >= 4 ? 'bg-amber-400' : star === 3 ? 'bg-amber-500/70' : 'bg-stone-500'}"
                        style="width: {pct}%"
                      ></div>
                    </div>
                    <span class="w-16 text-right font-mono text-white/60 text-[11px]">
                      {count} <span class="text-white/40">({pct}%)</span>
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- CSAT Metrics Card -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 text-white font-medium text-sm mb-3">
                <MorphIcon icon={Heart} size={16} strokeWidth={2} />
                <span>Chỉ Số Trải Nghiệm Tích Cực</span>
              </div>
              <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-white/60">Tỷ lệ hài lòng (4-5★):</span>
                  <span class="text-base font-serif font-medium text-emerald-300 font-mono">{feedbackCsat.csatPercent}%</span>
                </div>
                <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div class="bg-emerald-400 h-full rounded-full" style="width: {feedbackCsat.csatPercent}%"></div>
                </div>
                <p class="text-[11px] text-white/50 leading-relaxed pt-1">
                  {feedbackCsat.posCount} trên tổng số {feedbackCsat.totalCount} người dùng cảm nhận sự bình yên và yêu thích không gian Haven Art.
                </p>
              </div>
            </div>

            <!-- Category Filters -->
            <div class="pt-4 mt-4 border-t border-white/10">
              <span class="text-[11px] text-white/50 block mb-2">Lọc theo danh mục:</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onclick={() => { feedbackCategoryFilter = 'all'; }}
                  class="px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer {feedbackCategoryFilter === 'all' ? 'bg-amber-400 text-stone-900 font-medium' : 'bg-white/5 text-white/60 hover:text-white'}"
                >
                  Tất cả ({serverFeedbacks.length})
                </button>
                {#each Object.entries(FEEDBACK_CATEGORY_META) as [key, meta]}
                  {@const catCount = serverFeedbacks.filter((f) => f.category === key).length}
                  <button
                    type="button"
                    onclick={() => { feedbackCategoryFilter = key; }}
                    class="px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer {feedbackCategoryFilter === key ? 'bg-amber-400 text-stone-900 font-medium' : 'bg-white/5 text-white/60 hover:text-white'}"
                  >
                    <span>{meta.icon}</span> <span>{meta.label}</span> ({catCount})
                  </button>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback Cards Grid -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <h3 class="text-base font-serif font-medium text-white mb-4">
            Ý Kiến & Cảm Nhận Chi Tiết ({filteredFeedbacks.length})
          </h3>

          {#if filteredFeedbacks.length === 0}
            <div class="text-center py-12 text-white/40 text-xs sm:text-sm">
              <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/30">
                <MorphIcon icon={MessageSquare} size={20} />
              </div>
              <p class="font-medium text-white/60">Chưa có đánh giá nào phù hợp.</p>
              <p class="text-[11px] text-white/40 mt-1">Khi người dùng bấm biểu tượng Trái tim để gửi cảm nhận, nhận xét thực tế sẽ hiển thị tại đây.</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each filteredFeedbacks as fb (fb.id)}
                <div class="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 transition-all flex flex-col justify-between gap-3 group">
                  <!-- Header: Stars + Category + Date -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <div class="flex items-center text-amber-400 text-xs">
                        {#each Array(fb.rating) as _}
                          <span>★</span>
                        {/each}
                        {#each Array(5 - fb.rating) as _}
                          <span class="text-white/20">★</span>
                        {/each}
                      </div>

                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-white/80">
                        <span>{FEEDBACK_CATEGORY_META[fb.category]?.icon || '✨'}</span>
                        <span>{FEEDBACK_CATEGORY_META[fb.category]?.label || 'Chung'}</span>
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="text-[11px] text-white/40 font-mono">
                        {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <button
                        type="button"
                        onclick={() => handleDeleteFeedback(fb)}
                        class="p-1 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Xóa đánh giá này"
                      >
                        <MorphIcon icon={Trash2} size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  <!-- Author info -->
                  <div class="text-[11px] text-white/60 flex items-center gap-2">
                    <span class="font-medium text-white">{fb.userName}</span>
                    {#if fb.userEmail}
                      <span class="text-white/40 font-mono">({fb.userEmail})</span>
                    {/if}
                    {#if fb.device}
                      <span class="px-1.5 py-0.2 rounded text-[10px] bg-white/5 text-white/50 border border-white/5 font-mono ml-auto">
                        {fb.device}
                      </span>
                    {/if}
                  </div>

                  <!-- Comment Body -->
                  <div class="text-xs sm:text-sm text-stone-300 font-serif italic leading-relaxed pl-3 border-l-2 border-amber-400/40">
                    "{fb.comment}"
                  </div>

                  <!-- Footer note -->
                  <div class="text-[10px] text-white/30 font-mono text-right">
                    ID: {fb.id.slice(0, 12)}...
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- TAB 5: SERVER DATABASE ADMINISTRATION -->
    {#if activeTab === 'database'}
      <div class="space-y-6">
        <!-- Database Overview & File Metrics -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                <MorphIcon icon={Database} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Quản Trị Cơ Sở Dữ Liệu Máy Chủ (Server Database)</span>
              </h2>
              <p class="text-xs text-white/50 mt-0.5">
                Cơ sở dữ liệu tập trung lưu trữ tài khoản, bài viết, đánh giá và lưu lượng truy cập thực tế
              </p>
            </div>

            <button
              type="button"
              onclick={refreshAllServerData}
              disabled={isServerLoading}
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <MorphIcon icon={RefreshCw} size={13} strokeWidth={2} spin={isServerLoading} />
              <span>Làm mới</span>
            </button>
          </div>

          <!-- DB File Properties Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
            <div>
              <span class="text-white/40 block">Vị Trí CSDL Server</span>
              <span class="font-mono text-white text-xs mt-0.5 block truncate" title="data/server-db.json">data/server-db.json</span>
            </div>
            <div>
              <span class="text-white/40 block">Dung Lượng Tệp</span>
              <span class="font-mono text-amber-300 text-xs mt-0.5 block">
                {formatBytes(serverStats?.dbStats.fileSizeBytes ?? 0)}
              </span>
            </div>
            <div>
              <span class="text-white/40 block">Kiến Trúc Schema</span>
              <span class="font-mono text-emerald-300 text-xs mt-0.5 block">
                Version {serverStats?.dbStats.version || 2} (Multi-User)
              </span>
            </div>
            <div>
              <span class="text-white/40 block">Cập Nhật Gần Nhất</span>
              <span class="font-mono text-white/70 text-xs mt-0.5 block truncate">
                {serverStats?.dbStats.lastModifiedMs ? new Date(serverStats.dbStats.lastModifiedMs).toLocaleTimeString('vi-VN') : 'Mới cập nhật'}
              </span>
            </div>
          </div>
        </div>

        <!-- Maintenance & Operations Action Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Card 1: Backup Download -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-4">
            <div>
              <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300 mb-3">
                <MorphIcon icon={Download} size={18} strokeWidth={2} />
              </div>
              <h3 class="text-base font-serif font-medium text-white mb-1">Sao Lưu CSDL Máy Chủ</h3>
              <p class="text-xs text-white/60 leading-relaxed">
                Tải xuống toàn bộ tệp CSDL JSON chứa tài khoản, bài viết nhật ký, đánh giá và lịch sử phiên truy cập.
              </p>
            </div>
            <button
              type="button"
              onclick={handleDownloadServerDbBackup}
              class="w-full py-2.5 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <MorphIcon icon={Download} size={14} strokeWidth={2} />
              <span>Tải Xuất Bản Sao Lưu (.json)</span>
            </button>
          </div>

          <!-- Card 2: Restore / Upload -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-4">
            <div>
              <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 mb-3">
                <MorphIcon icon={Upload} size={18} strokeWidth={2} />
              </div>
              <h3 class="text-base font-serif font-medium text-white mb-1">Phục Hồi CSDL Từ File</h3>
              <p class="text-xs text-white/60 leading-relaxed">
                Nhập file sao lưu JSON hợp lệ để đồng bộ hoặc khôi phục dữ liệu lên server.
              </p>
              <input
                type="file"
                accept=".json"
                bind:this={dbFileInputRef}
                onchange={handleUploadServerDbBackup}
                class="hidden"
              />
            </div>
            <button
              type="button"
              onclick={() => dbFileInputRef?.click()}
              class="w-full py-2.5 px-3.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <MorphIcon icon={Upload} size={14} strokeWidth={2} />
              <span>Tải Lên Bản Phục Hồi (.json)</span>
            </button>
          </div>

          <!-- Card 3: Root Security & Maintenance -->
          <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-4">
            <div>
              <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 mb-3">
                <MorphIcon icon={ShieldCheck} size={18} strokeWidth={2} />
              </div>
              <h3 class="text-base font-serif font-medium text-white mb-1">Bảo Mật & Quản Trị Viên</h3>
              <p class="text-xs text-white/60 leading-relaxed">
                Đổi mật khẩu tài khoản Root Admin hoặc dọn dẹp các bản ghi bài viết đã xóa tạm khỏi hệ thống.
              </p>
            </div>
            <div class="space-y-2">
              <button
                type="button"
                onclick={() => { showChangePasswordModal = true; }}
                class="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 hover:text-white text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MorphIcon icon={KeyRound} size={14} strokeWidth={1.75} />
                <span>Đổi Mật Khẩu Admin Root</span>
              </button>

              <button
                type="button"
                onclick={handlePurgeServerDeletedEntries}
                class="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-rose-100 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MorphIcon icon={Trash2} size={14} strokeWidth={1.75} />
                <span>Dọn Rác Bài Viết Đã Xóa Tạm</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Real Traffic & Sessions Metrics -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-serif font-medium text-white flex items-center gap-2">
              <MorphIcon icon={Clock} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
              <span>Phân Tích Lưu Lượng & Thời Lượng Thực Tế (Server Sessions)</span>
            </h3>
            <span class="text-xs text-cyan-300 font-mono">
              Tổng {serverStats?.analytics.visits.total ?? 0} lượt truy cập
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Duration -->
            <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span class="text-xs text-white/50 block">Thời Lượng Trung Bình Mỗi Phiên</span>
              <span class="text-2xl font-serif font-medium text-white mt-1 block">
                {formatDuration(serverStats?.analytics.duration.averageSeconds || 0)}
              </span>
              <span class="text-[11px] text-white/40 block mt-1">Được tính từ nhịp tim heartbeat máy chủ</span>
            </div>

            <!-- Visits breakdown -->
            <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span class="text-xs text-white/50 block">Truy Cập Hôm Nay / 7 Ngày</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl font-serif font-medium text-amber-300">
                  {serverStats?.analytics.visits.today || 0}
                </span>
                <span class="text-xs text-white/50">hôm nay</span>
                <span class="text-white/30">•</span>
                <span class="text-lg font-serif text-white/80">
                  {serverStats?.analytics.visits.thisWeek || 0}
                </span>
                <span class="text-xs text-white/50">tuần này</span>
              </div>
              <span class="text-[11px] text-white/40 block mt-1">Ghi nhận liên tục từ telemetry</span>
            </div>

            <!-- Devices breakdown -->
            <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span class="text-xs text-white/50 block">Phân Bổ Thiết Bị</span>
              <div class="flex items-center gap-3 mt-2 text-xs">
                <div>
                  <span class="text-white/40 block text-[10px]">Máy tính</span>
                  <span class="font-mono text-white font-medium">{serverStats?.analytics.devices.desktop || 0}</span>
                </div>
                <div>
                  <span class="text-white/40 block text-[10px]">Điện thoại</span>
                  <span class="font-mono text-cyan-300 font-medium">{serverStats?.analytics.devices.mobile || 0}</span>
                </div>
                <div>
                  <span class="text-white/40 block text-[10px]">Máy tính bảng</span>
                  <span class="font-mono text-amber-300 font-medium">{serverStats?.analytics.devices.tablet || 0}</span>
                </div>
              </div>
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

        <!-- Multi-Provider Photo Hub & Live Photo APIs -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-2 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  <MorphIcon icon={Image} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                </span>
                <div>
                  <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                    <span>Trung Tâm Nguồn Ảnh (Multi-Provider Photo Hub)</span>
                  </h2>
                  <p class="text-xs text-white/50 mt-0.5">Kết nối đa nền tảng ảnh phong cảnh HD: Pixabay, Unsplash, Wikimedia Commons & Pexels</p>
                </div>
              </div>
            </div>

            <div>
              {#if hasPixabayApiKey() || hasUnsplashApiKey() || hasPexelsApiKey()}
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Đang Bật Nguồn Live API
                </span>
              {:else}
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <span class="w-2 h-2 rounded-full bg-sky-400"></span>
                  Wikimedia Mở & 75 Ảnh Tuyển Sẵn
                </span>
              {/if}
            </div>
          </div>

          <!-- Quick Status Overview of Providers -->
          <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <!-- Pixabay status -->
            <button
              type="button"
              onclick={() => (activeProviderTab = 'pixabay')}
              class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {activeProviderTab === 'pixabay' ? 'bg-amber-400/10 border-amber-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-amber-300 font-medium text-xs">🌟 Pixabay</span>
                <span class="text-[10px] font-mono {hasPixabayApiKey() ? 'text-emerald-300 font-bold' : 'text-white/40'}">
                  {hasPixabayApiKey() ? '● Live' : '○ Chưa key'}
                </span>
              </div>
              <div class="text-[11px] text-white/50 mt-1 truncate">Khuyên dùng, duyệt tức thì</div>
            </button>

            <!-- Unsplash status -->
            <button
              type="button"
              onclick={() => (activeProviderTab = 'unsplash')}
              class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {activeProviderTab === 'unsplash' ? 'bg-purple-500/10 border-purple-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-purple-300 font-medium text-xs">📸 Unsplash</span>
                <span class="text-[10px] font-mono {hasUnsplashApiKey() ? 'text-emerald-300 font-bold' : 'text-white/40'}">
                  {hasUnsplashApiKey() ? '● Live' : '○ Chưa key'}
                </span>
              </div>
              <div class="text-[11px] text-white/50 mt-1 truncate">Nghệ thuật HD 1920px</div>
            </button>

            <!-- Wikimedia Commons status -->
            <button
              type="button"
              onclick={() => (activeProviderTab = 'wikimedia')}
              class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {activeProviderTab === 'wikimedia' ? 'bg-sky-500/10 border-sky-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-sky-300 font-medium text-xs">🏛️ Wikimedia</span>
                <span class="text-[10px] font-mono text-sky-300 font-bold">
                  ● Mở 100%
                </span>
              </div>
              <div class="text-[11px] text-white/50 mt-1 truncate">Không cần API key</div>
            </button>

            <!-- Pexels status -->
            <button
              type="button"
              onclick={() => (activeProviderTab = 'pexels')}
              class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {activeProviderTab === 'pexels' ? 'bg-emerald-500/10 border-emerald-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-emerald-300 font-medium text-xs">🌿 Pexels</span>
                <span class="text-[10px] font-mono {hasPexelsApiKey() ? 'text-emerald-300 font-bold' : 'text-amber-400/80'}">
                  {hasPexelsApiKey() ? '● Live' : 'Tạm dừng mới'}
                </span>
              </div>
              <div class="text-[11px] text-white/50 mt-1 truncate">Dành cho key cũ</div>
            </button>
          </div>

          <!-- Provider Sub-Tabs -->
          <div class="mt-5 border-b border-white/10 flex items-center gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onclick={() => (activeProviderTab = 'pixabay')}
              class="px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap {activeProviderTab === 'pixabay' ? 'bg-amber-400 text-black shadow-sm font-semibold' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}"
            >
              <span>🌟 Pixabay API</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] {activeProviderTab === 'pixabay' ? 'bg-black/20 text-black font-bold' : 'bg-amber-400/20 text-amber-300'}">Khuyên dùng</span>
            </button>

            <button
              type="button"
              onclick={() => (activeProviderTab = 'unsplash')}
              class="px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap {activeProviderTab === 'unsplash' ? 'bg-purple-500 text-white shadow-sm font-semibold' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}"
            >
              <span>📸 Unsplash API</span>
              {#if hasUnsplashApiKey()}
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {/if}
            </button>

            <button
              type="button"
              onclick={() => (activeProviderTab = 'wikimedia')}
              class="px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap {activeProviderTab === 'wikimedia' ? 'bg-sky-500 text-white shadow-sm font-semibold' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}"
            >
              <span>🏛️ Wikimedia Commons</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] {activeProviderTab === 'wikimedia' ? 'bg-white/20 text-white font-bold' : 'bg-sky-400/20 text-sky-300'}">Không cần key</span>
            </button>

            <button
              type="button"
              onclick={() => (activeProviderTab = 'pexels')}
              class="px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap {activeProviderTab === 'pexels' ? 'bg-emerald-500 text-white shadow-sm font-semibold' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}"
            >
              <span>🌿 Pexels API</span>
              {#if hasPexelsApiKey()}
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
              {/if}
            </button>
          </div>

          <!-- TAB CONTENT: PIXABAY -->
          {#if activeProviderTab === 'pixabay'}
            <div class="mt-4 space-y-4">
              <div class="p-3.5 rounded-2xl bg-amber-400/5 border border-amber-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div class="space-y-1">
                  <p class="text-amber-200 font-medium">✨ Pixabay: Cấp API Key miễn phí ngay lập tức (100% không chờ duyệt)</p>
                  <p class="text-white/60">Hạn mức lên tới 100 requests/phút. Cung cấp kho ảnh phong cảnh thiên nhiên, núi rừng, đại dương cực kỳ tráng lệ và mượt mà.</p>
                </div>
                <a
                  href="https://pixabay.com/api/docs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-black font-medium shrink-0 hover:bg-amber-300 transition-colors"
                >
                  <span>Lấy Pixabay Key ngay</span>
                  <MorphIcon icon={ExternalLink} size={12} strokeWidth={2} spring="smooth" reducedMotion="user" />
                </a>
              </div>

              <div class="flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1">
                  <input
                    type="password"
                    bind:value={pixabayApiKeyInput}
                    placeholder="Nhập Pixabay API Key (ví dụ: 49481928-09ac2b...)"
                    class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 transition-all font-mono"
                  />
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={handleTestPixabayKey}
                    disabled={isTestingPixabayKey}
                    class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {#if isTestingPixabayKey}
                      <div class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Đang kiểm tra...</span>
                    {:else}
                      <MorphIcon icon={RefreshCw} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                      <span>Kiểm tra kết nối</span>
                    {/if}
                  </button>

                  <button
                    type="button"
                    onclick={handleSavePixabayKey}
                    class="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-medium text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <MorphIcon icon={CheckCircle2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    <span>Lưu cấu hình</span>
                  </button>

                  {#if pixabayApiKeyInput}
                    <button
                      type="button"
                      onclick={handleClearPixabayKey}
                      class="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-300 border border-white/10 transition-all cursor-pointer"
                      title="Xóa Key"
                    >
                      <MorphIcon icon={Trash2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    </button>
                  {/if}
                </div>
              </div>

              {#if pixabayTestResult}
                <div class="p-3.5 rounded-xl text-xs flex items-start gap-2.5 {pixabayTestResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'}">
                  <div class="shrink-0 mt-0.5">
                    {#if pixabayTestResult.success}
                      <MorphIcon icon={CheckCircle2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    {:else}
                      <MorphIcon icon={AlertTriangle} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    {/if}
                  </div>
                  <div class="font-medium">{pixabayTestResult.message}</div>
                </div>
              {/if}
            </div>
          {/if}

          <!-- TAB CONTENT: UNSPLASH -->
          {#if activeProviderTab === 'unsplash'}
            <div class="mt-4 space-y-4">
              <div class="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div class="space-y-1">
                  <p class="text-purple-200 font-medium">📸 Unsplash: Nền tảng ảnh nghệ thuật phong cảnh 1920px hàng đầu thế giới</p>
                  <p class="text-white/60">Tạo ứng dụng miễn phí trên Unsplash Developer để nhận Access Key (50 requests/giờ trong chế độ demo, 5000 req/giờ khi duyệt).</p>
                </div>
                <a
                  href="https://unsplash.com/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500 text-white font-medium shrink-0 hover:bg-purple-400 transition-colors"
                >
                  <span>Mở Unsplash Developer</span>
                  <MorphIcon icon={ExternalLink} size={12} strokeWidth={2} spring="smooth" reducedMotion="user" />
                </a>
              </div>

              <div class="flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1">
                  <input
                    type="password"
                    bind:value={unsplashApiKeyInput}
                    placeholder="Nhập Unsplash Access Key (ví dụ: client_id=...)"
                    class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/50 transition-all font-mono"
                  />
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={handleTestUnsplashKey}
                    disabled={isTestingUnsplashKey}
                    class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {#if isTestingUnsplashKey}
                      <div class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Đang kiểm tra...</span>
                    {:else}
                      <MorphIcon icon={RefreshCw} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                      <span>Kiểm tra kết nối</span>
                    {/if}
                  </button>

                  <button
                    type="button"
                    onclick={handleSaveUnsplashKey}
                    class="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-medium text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <MorphIcon icon={CheckCircle2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    <span>Lưu cấu hình</span>
                  </button>

                  {#if unsplashApiKeyInput}
                    <button
                      type="button"
                      onclick={handleClearUnsplashKey}
                      class="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-300 border border-white/10 transition-all cursor-pointer"
                      title="Xóa Key"
                    >
                      <MorphIcon icon={Trash2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    </button>
                  {/if}
                </div>
              </div>

              {#if unsplashTestResult}
                <div class="p-3.5 rounded-xl text-xs flex items-start gap-2.5 {unsplashTestResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'}">
                  <div class="shrink-0 mt-0.5">
                    {#if unsplashTestResult.success}
                      <MorphIcon icon={CheckCircle2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    {:else}
                      <MorphIcon icon={AlertTriangle} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    {/if}
                  </div>
                  <div class="font-medium">{unsplashTestResult.message}</div>
                </div>
              {/if}
            </div>
          {/if}

          <!-- TAB CONTENT: WIKIMEDIA COMMONS -->
          {#if activeProviderTab === 'wikimedia'}
            <div class="mt-4 space-y-4">
              <div class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-3">
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/20 text-sky-200 border border-sky-400/30">
                    <span class="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                    Sẵn Sàng Tự Động (Zero-Configuration)
                  </span>
                  <a
                    href="https://commons.wikimedia.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sky-300 hover:text-sky-200 underline inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Khám phá Wikimedia Commons</span>
                    <MorphIcon icon={ExternalLink} size={11} strokeWidth={2} spring="smooth" reducedMotion="user" />
                  </a>
                </div>

                <p class="text-white/80 leading-relaxed">
                  Wikimedia Commons là kho lưu trữ tự do lớn nhất hành tinh. Haven Art tích hợp trực tiếp qua MediaWiki Open API mà <strong>không cần bất kỳ API key nào</strong>. Khi các nguồn khác chưa cấu hình hoặc tạm dừng, hệ thống tự động tìm nạp các kiệt tác danh họa (Monet, Van Gogh, Hokusai, Constable...) và ảnh thiên nhiên công cộng.
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div class="font-medium text-white">🌐 100% Mở & Miễn Phí</div>
                    <div class="text-[11px] text-white/50 mt-0.5">Không sợ hết hạn key hay tạm dừng cấp tài khoản mới.</div>
                  </div>
                  <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div class="font-medium text-white">📜 Bản Quyền Minh Bạch</div>
                    <div class="text-[11px] text-white/50 mt-0.5">Public Domain & Creative Commons tự do sử dụng.</div>
                  </div>
                  <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div class="font-medium text-white">🛡️ Tự Động Fallback</div>
                    <div class="text-[11px] text-white/50 mt-0.5">Đảm bảo màn hình luôn có ảnh tĩnh tâm sống động.</div>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- TAB CONTENT: PEXELS -->
          {#if activeProviderTab === 'pexels'}
            <div class="mt-4 space-y-4">
              <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <p class="text-amber-200 font-medium">⚠️ Thông báo trạng thái Pexels API</p>
                <p class="text-white/60 mt-1">Pexels hiện đang tạm dừng duyệt cấp API key cho các nhà phát triển mới. Nếu bạn đã có sẵn API key từ trước, bạn vẫn có thể dán vào bên dưới để kích hoạt bình thường.</p>
              </div>

              <div class="flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1">
                  <input
                    type="password"
                    bind:value={pexelsApiKeyInput}
                    placeholder="Nhập Pexels API Key nếu bạn đã có (ví dụ: aB39kL...)"
                    class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 transition-all font-mono"
                  />
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={handleTestPexelsKey}
                    disabled={isTestingPexelsKey}
                    class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {#if isTestingPexelsKey}
                      <div class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Đang kiểm tra...</span>
                    {:else}
                      <MorphIcon icon={RefreshCw} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                      <span>Kiểm tra kết nối</span>
                    {/if}
                  </button>

                  <button
                    type="button"
                    onclick={handleSavePexelsKey}
                    class="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-medium text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <MorphIcon icon={CheckCircle2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    <span>Lưu cấu hình</span>
                  </button>

                  {#if pexelsApiKeyInput}
                    <button
                      type="button"
                      onclick={handleClearPexelsKey}
                      class="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-300 border border-white/10 transition-all cursor-pointer"
                      title="Xóa Key"
                    >
                      <MorphIcon icon={Trash2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    </button>
                  {/if}
                </div>
              </div>

              {#if pexelsTestResult}
                <div class="p-3.5 rounded-xl text-xs flex items-start gap-2.5 {pexelsTestResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'}">
                  <div class="shrink-0 mt-0.5">
                    {#if pexelsTestResult.success}
                      <MorphIcon icon={CheckCircle2} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    {:else}
                      <MorphIcon icon={AlertTriangle} size={14} strokeWidth={2} spring="smooth" reducedMotion="user" />
                    {/if}
                  </div>
                  <div class="font-medium">{pexelsTestResult.message}</div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Artworks & Photography Gallery -->
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
            <div>
              <h2 class="text-base sm:text-lg font-serif font-medium text-white flex items-center gap-2">
                <MorphIcon icon={Image} size={18} strokeWidth={2} spring="smooth" reducedMotion="user" />
                <span>Kho Hình Nền Tuyển Chọn & Danh Họa ({filteredArtworks.length} / {ALL_HAVEN_ARTWORKS.length})</span>
              </h2>
              <p class="text-xs text-white/50 mt-0.5">Ảnh thiên nhiên phân giải cao 1920px và kiệt tác cổ điển đa nguồn bản quyền tự do</p>
            </div>

            <!-- Category Filter Tabs -->
            <div class="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onclick={() => (artworkCategoryFilter = 'all')}
                class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer {artworkCategoryFilter === 'all' ? 'bg-amber-400 text-black font-medium shadow-sm' : 'text-white/60 hover:text-white'}"
              >
                Tất cả ({ALL_HAVEN_ARTWORKS.length})
              </button>
              <button
                type="button"
                onclick={() => (artworkCategoryFilter = 'unsplash')}
                class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer {artworkCategoryFilter === 'unsplash' ? 'bg-purple-500 text-white font-medium shadow-sm' : 'text-white/60 hover:text-white'}"
              >
                📸 Unsplash (20)
              </button>
              <button
                type="button"
                onclick={() => (artworkCategoryFilter = 'pixabay')}
                class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer {artworkCategoryFilter === 'pixabay' ? 'bg-amber-400 text-black font-medium shadow-sm' : 'text-white/60 hover:text-white'}"
              >
                🌟 Pixabay (15)
              </button>
              <button
                type="button"
                onclick={() => (artworkCategoryFilter = 'pexels')}
                class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer {artworkCategoryFilter === 'pexels' ? 'bg-emerald-500 text-white font-medium shadow-sm' : 'text-white/60 hover:text-white'}"
              >
                🌿 Pexels (35)
              </button>
              <button
                type="button"
                onclick={() => (artworkCategoryFilter = 'classical')}
                class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer {artworkCategoryFilter === 'classical' ? 'bg-sky-500 text-white font-medium shadow-sm' : 'text-white/60 hover:text-white'}"
              >
                🎨 Danh Họa (5)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {#each filteredArtworks as artwork (artwork.id)}
              <div class="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/25 transition-all">
                <div class="aspect-[4/3] w-full overflow-hidden bg-black/40 relative">
                  <img
                    src={artwork.src}
                    alt={artwork.title}
                    loading="lazy"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div class="absolute top-2 left-2">
                    {#if artwork.provider === 'unsplash' || artwork.id.startsWith('unsplash-')}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-md bg-purple-500/40 text-purple-200 border border-purple-400/40">
                        📸 Unsplash HD
                      </span>
                    {:else if artwork.provider === 'pixabay' || artwork.id.startsWith('pixabay-')}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-md bg-amber-500/40 text-amber-200 border border-amber-400/40">
                        🌟 Pixabay HD
                      </span>
                    {:else if artwork.provider === 'pexels' || artwork.id.startsWith('pexels')}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-md bg-emerald-500/40 text-emerald-200 border border-emerald-400/40">
                        🌿 Pexels HD
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-md bg-sky-500/40 text-sky-200 border border-sky-400/40">
                        🎨 Bảo Tàng
                      </span>
                    {/if}
                  </div>
                </div>
                <div class="p-3.5">
                  <h3 class="font-serif font-medium text-white text-sm truncate" title={artwork.title}>
                    {artwork.title}
                  </h3>
                  <p class="text-xs text-white/60 truncate mt-0.5">{artwork.artist}</p>
                  <div class="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
                    <span class="truncate max-w-[120px]" title={artwork.license}>{artwork.license}</span>
                    <a
                      href={artwork.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-amber-300/80 hover:text-amber-200 transition-colors shrink-0"
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
