import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSystemTelemetry,
  logSystemEvent,
  getRecentEvents,
  clearRecentEvents,
  generateDiagnosticReport,
  formatBytes,
  formatDuration,
  runDatabasePurge,
  requestStoragePersistence,
  clearAllPwaCaches,
} from '../../src/lib/telemetry/system-monitor';
import { JournalRepository } from '../../src/lib/db/repository';

describe('System Telemetry & Monitoring Subsystem', () => {
  let testRepo: JournalRepository;
  const TEST_DB = 'test-haven-telemetry-db';

  beforeEach(async () => {
    testRepo = new JournalRepository(TEST_DB);
    await testRepo.init();
    clearRecentEvents();
  });

  afterEach(async () => {
    await testRepo.close();
    indexedDB.deleteDatabase(TEST_DB);
    clearRecentEvents();
    vi.restoreAllMocks();
  });

  describe('formatBytes helper', () => {
    it('formats bytes into human readable binary units', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
      expect(formatBytes(52428800, 2)).toBe('50.00 MB');
    });
  });

  describe('formatDuration helper', () => {
    it('formats seconds into readable HH:MM:SS or MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(45)).toBe('00:45');
      expect(formatDuration(125)).toBe('02:05');
      expect(formatDuration(3665)).toBe('01:01:05');
    });
  });

  describe('Event Logging System', () => {
    it('logs, limits and retrieves recent events in chronological order', () => {
      logSystemEvent({
        level: 'info',
        category: 'system',
        message: 'Trang web khởi động',
      });
      logSystemEvent({
        level: 'success',
        category: 'audio',
        message: 'Khởi tạo âm thanh thành công',
      });

      const events = getRecentEvents();
      expect(events.length).toBe(2);
      expect(events[0].message).toBe('Khởi tạo âm thanh thành công'); // Most recent first
      expect(events[1].message).toBe('Trang web khởi động');
      expect(events[0].id).toBeDefined();
      expect(events[0].timestamp).toBeGreaterThan(0);
    });

    it('clears recent events properly', () => {
      logSystemEvent({ level: 'warn', category: 'db', message: 'Cảnh báo kết nối' });
      expect(getRecentEvents().length).toBe(1);
      clearRecentEvents();
      expect(getRecentEvents().length).toBe(0);
    });
  });

  describe('getSystemTelemetry', () => {
    it('aggregates hardware, audio catalog, visuals, and database metrics', async () => {
      // Create some test entries
      await testRepo.createEntry({
        title: 'Ngày thanh thản',
        body: 'Hôm nay trời rất trong và lòng bình yên.',
        mood: 'calm',
      });
      await testRepo.createEntry({
        title: 'Biết ơn cuộc đời',
        body: 'Cảm ơn những khoảnh khắc tĩnh lặng.',
        mood: 'grateful',
      });
      const deletedEntry = await testRepo.createEntry({
        title: 'Bài viết tạm',
        body: 'Bài này sẽ bị xóa mềm.',
        mood: 'calm',
      });
      await testRepo.softDeleteEntry(deletedEntry.id);

      const telemetry = await getSystemTelemetry({ repo: testRepo });

      expect(telemetry.timestamp).toBeGreaterThan(0);
      expect(telemetry.uptimeSeconds).toBeGreaterThanOrEqual(0);

      // Storage metrics
      expect(telemetry.storage.entriesCount).toBe(2);
      expect(telemetry.storage.softDeletedCount).toBe(1);
      expect(telemetry.storage.moodBreakdown.calm).toBe(1);
      expect(telemetry.storage.moodBreakdown.grateful).toBe(1);
      expect(telemetry.storage.totalWords).toBeGreaterThan(0);

      // Audio catalog metrics
      expect(telemetry.audio.totalTracks).toBeGreaterThanOrEqual(8);
      expect(telemetry.audio.pianoTracksCount).toBeGreaterThanOrEqual(3);
      expect(telemetry.audio.ambientTracksCount).toBeGreaterThanOrEqual(5);

      // Visuals catalog metrics
      expect(telemetry.visual.totalArtworks).toBeGreaterThanOrEqual(5);

      // Device & platform
      expect(telemetry.device.userAgent).toBeDefined();
      expect(typeof telemetry.device.isOnline).toBe('boolean');
    });

    it('handles null or missing repository gracefully without throwing', async () => {
      const telemetry = await getSystemTelemetry();
      expect(telemetry.storage.entriesCount).toBe(0);
      expect(telemetry.storage.softDeletedCount).toBe(0);
      expect(telemetry.audio.totalTracks).toBeGreaterThanOrEqual(8);
    });
  });

  describe('generateDiagnosticReport', () => {
    it('produces valid JSON containing all system diagnostic sections', async () => {
      const telemetry = await getSystemTelemetry({ repo: testRepo });
      const reportJson = generateDiagnosticReport(telemetry);

      expect(typeof reportJson).toBe('string');
      const parsed = JSON.parse(reportJson);

      expect(parsed.reportType).toBe('haven-art-system-diagnostics');
      expect(parsed.version).toBe('1.0');
      expect(parsed.generatedAt).toBeDefined();
      expect(parsed.telemetry).toBeDefined();
      expect(parsed.telemetry.storage).toBeDefined();
      expect(parsed.telemetry.performance).toBeDefined();
      expect(parsed.telemetry.audio).toBeDefined();
      expect(parsed.telemetry.visual).toBeDefined();
    });
  });

  describe('Maintenance Operations', () => {
    it('runDatabasePurge purges expired deletes and logs a system event', async () => {
      const entry = await testRepo.createEntry({
        title: 'Cần dọn dẹp',
        body: 'Nội dung sẽ bị xóa vĩnh viễn',
      });
      await testRepo.softDeleteEntry(entry.id);

      const count = await runDatabasePurge(testRepo, 0);
      expect(count).toBe(1);

      const events = getRecentEvents();
      expect(events[0].category).toBe('db');
      expect(events[0].level).toBe('success');
      expect(events[0].message).toContain('1 bài viết');
    });

    it('clearAllPwaCaches handles environments gracefully', async () => {
      const count = await clearAllPwaCaches();
      expect(typeof count).toBe('number');
    });

    it('requestStoragePersistence handles environments gracefully', async () => {
      const persisted = await requestStoragePersistence();
      expect(typeof persisted).toBe('boolean');
    });
  });
});
