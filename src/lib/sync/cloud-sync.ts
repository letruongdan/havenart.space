/**
 * Haven Art Cloud Synchronization Service
 * Coordinates bidirectional sync between local IndexedDB and Server Storage.
 */

import type { JournalEntry } from '../db/schema';
import type { JournalRepository } from '../db/repository';
import { getAuthToken, isUserLoggedIn, getCurrentUser } from '../auth/user-client';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  serverTotal: number;
  pulledCount?: number;
  lastSyncedAt?: number;
  error?: string;
}

const syncKey = () => `haven_last_synced_at:${getCurrentUser()?.id || 'guest'}`;

export function getLastSyncedAt(): number | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(syncKey());
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function setLastSyncedAt(timestamp: number): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(syncKey(), timestamp.toString());
      window.dispatchEvent(
        new CustomEvent('haven:sync-status-changed', {
          detail: { lastSyncedAt: timestamp },
        })
      );
    }
  } catch {}
}

/**
 * Push specific entries to server.
 */
export async function pushEntriesToServer(
  entries: JournalEntry[],
  session = {token:getAuthToken(),userId:getCurrentUser()?.id}
): Promise<SyncResult> {
  const token = session.token;
  if (!token || !isUserLoggedIn()) {
    return {
      success: false,
      syncedCount: 0,
      serverTotal: 0,
      error: 'Chưa đăng nhập tài khoản.',
    };
  }

  try {
    const res = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ entries }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        syncedCount: 0,
        serverTotal: 0,
        error: data.error || 'Lỗi đồng bộ lên máy chủ.',
      };
    }

    const now = Date.now();

    return {
      success: true,
      syncedCount: data.syncedCount,
      serverTotal: data.totalCount,
      lastSyncedAt: now,
    };
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      serverTotal: 0,
      error: err?.message || 'Lỗi kết nối máy chủ.',
    };
  }
}

/**
 * Pull all active entries from server.
 */
export async function pullEntriesFromServer(session = {token:getAuthToken(),userId:getCurrentUser()?.id}): Promise<{
  success: boolean;
  entries: JournalEntry[];
  error?: string;
}> {
  const token = session.token;
  if (!token || !isUserLoggedIn()) {
    return { success: false, entries: [], error: 'Chưa đăng nhập.' };
  }

  try {
    const res = await fetch('/api/sync/pull', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        entries: [],
        error: data.error || 'Lỗi tải dữ liệu từ máy chủ.',
      };
    }

    const entries: JournalEntry[] = (data.entries || []).map((e: any) => ({
      id: e.id,
      title: e.title || '',
      body: e.body,
      mood: e.mood,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      deletedAt: e.deletedAt ?? null,
    }));

    return { success: true, entries };
  } catch (err: any) {
    return {
      success: false,
      entries: [],
      error: err?.message || 'Lỗi mạng khi tải dữ liệu.',
    };
  }
}

/**
 * Full bidirectional synchronization:
 * 1. Read local entries from IndexedDB.
 * 2. Push all local entries to server.
 * 3. Pull all server entries and insert/update newer ones locally.
 */
export async function syncAllWithServer(
  repo: JournalRepository
): Promise<SyncResult> {
  if (!isUserLoggedIn()) {
    return {
      success: false,
      syncedCount: 0,
      serverTotal: 0,
      error: 'Vui lòng đăng nhập để đồng bộ dữ liệu.',
    };
  }

  try {
    const session = {token:getAuthToken(),userId:getCurrentUser()?.id};
    if (repo.ownerId && repo.ownerId !== session.userId) throw new Error('Dữ liệu thuộc tài khoản khác.');
    const stillCurrent = () => session.token === getAuthToken() && session.userId === getCurrentUser()?.id;
    const localEntries = await repo.listEntries(true);
    if (!stillCurrent()) throw new Error('Tài khoản đã thay đổi.');

    // 2. Push to server
    const pushResult = await pushEntriesToServer(localEntries, session);
    if (!pushResult.success) {
      return pushResult;
    }

    // 3. Pull from server to get any entries created on other devices
    if (!stillCurrent()) throw new Error('Tài khoản đã thay đổi.');
    const pullResult = await pullEntriesFromServer(session);
    if (!pullResult.success) return {...pushResult,success:false,error:pullResult.error};
    if (!stillCurrent()) throw new Error('Tài khoản đã thay đổi.');
    let pulledCount = 0;

    if (pullResult.success && pullResult.entries.length > 0) {
      for (const serverEntry of pullResult.entries) {
        if (!stillCurrent()) throw new Error('Tài khoản đã thay đổi.');
        if (await repo.applyRemoteEntry(serverEntry)) pulledCount++;
      }
    }

    if (!stillCurrent()) throw new Error('Tài khoản đã thay đổi.');
    const now = Date.now();
    setLastSyncedAt(now);

    return {
      success: true,
      syncedCount: pushResult.syncedCount,
      serverTotal: pushResult.serverTotal,
      pulledCount,
      lastSyncedAt: now,
    };
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      serverTotal: 0,
      error: err?.message || 'Lỗi trong quá trình đồng bộ.',
    };
  }
}
