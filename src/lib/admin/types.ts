export interface ServerStatsData {
    analytics: {
      visits: { total: number; today: number; thisWeek: number };
      duration: { averageSeconds: number; totalSeconds: number };
      devices: { desktop: number; mobile: number; tablet: number };
      browsers?: Record<string, number>;
      operatingSystems?: Record<string, number>;
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
    createdIp?: string;
    lastIp?: string;
    lastUserAgent?: string;
    lastBrowser?: string;
    lastBrowserVersion?: string;
    lastOs?: string;
    lastDevice?: 'desktop' | 'mobile' | 'tablet';
    lastLanguage?: string;
    loginCount?: number;
  }

export interface UserLoginHistoryItem {
    id: string;
    userId: string;
    email: string;
    ip: string;
    userAgent?: string;
    browser: string;
    browserVersion?: string;
    os: string;
    device: 'desktop' | 'mobile' | 'tablet';
    language: string;
    status: 'success' | 'failed';
    timestamp: number;
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
