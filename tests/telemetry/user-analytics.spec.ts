import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordVisit,
  updateActiveDuration,
  saveUserFeedback,
  getUserFeedbacks,
  deleteUserFeedback,
  getUserAnalyticsSummary,
  resetUserAnalyticsForTesting,
} from '../../src/lib/telemetry/user-analytics';
import { JournalRepository } from '../../src/lib/db/repository';

describe('User Analytics & Engagement Telemetry', () => {
  let testRepo: JournalRepository;
  const TEST_DB = 'test-haven-user-analytics-db';

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    resetUserAnalyticsForTesting();
    testRepo = new JournalRepository(TEST_DB);
    await testRepo.init();
  });

  afterEach(async () => {
    await testRepo.close();
    indexedDB.deleteDatabase(TEST_DB);
    localStorage.clear();
    sessionStorage.clear();
    resetUserAnalyticsForTesting();
  });

  describe('Visits & Sessions Tracking', () => {
    it('records first visit and initializes session', async () => {
      recordVisit();
      const stats = await getUserAnalyticsSummary();
      expect(stats.visits.total).toBeGreaterThanOrEqual(1);
      expect(stats.visits.uniqueSessions).toBeGreaterThanOrEqual(1);
      expect(stats.visits.today).toBeGreaterThanOrEqual(1);
      expect(stats.visits.dailyHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('increments total visits on subsequent visits', async () => {
      recordVisit();
      // Clear session flag to simulate new visit
      sessionStorage.removeItem('haven_session_active');
      recordVisit();
      const stats = await getUserAnalyticsSummary();
      expect(stats.visits.total).toBe(2);
      expect(stats.visits.uniqueSessions).toBe(2);
    });
  });

  describe('Duration & Engagement Tracking', () => {
    it('accumulates active time and music playback time', async () => {
      updateActiveDuration(15, false);
      updateActiveDuration(20, true);

      const stats = await getUserAnalyticsSummary();
      expect(stats.duration.currentSessionSeconds).toBe(35);
      expect(stats.duration.totalDurationSeconds).toBe(35);
      expect(stats.duration.musicListeningSeconds).toBe(20);
    });
  });

  describe('User Ratings & Feedback', () => {
    it('saves user feedback and calculates average rating', async () => {
      const fb1 = saveUserFeedback({
        rating: 5,
        category: 'peace',
        comment: 'Không gian rất tuyệt vời và thư thái!',
      });
      expect(fb1.id).toBeDefined();
      expect(fb1.rating).toBe(5);

      const fb2 = saveUserFeedback({
        rating: 4,
        category: 'music',
        comment: 'Nhạc piano rất hay, nên thêm bài mới.',
      });
      expect(fb2.rating).toBe(4);

      const list = getUserFeedbacks();
      expect(list.some((f) => f.id === fb1.id)).toBe(true);
      expect(list.some((f) => f.id === fb2.id)).toBe(true);

      const stats = await getUserAnalyticsSummary();
      expect(stats.feedback.totalCount).toBeGreaterThanOrEqual(2);
      expect(stats.feedback.distribution[5]).toBeGreaterThanOrEqual(1);
      expect(stats.feedback.distribution[4]).toBeGreaterThanOrEqual(1);
      expect(stats.feedback.averageRating).toBeGreaterThanOrEqual(4.0);
    });

    it('allows deleting feedback by ID', () => {
      const fb = saveUserFeedback({
        rating: 5,
        category: 'general',
        comment: 'Tuyệt hảo!',
      });
      expect(getUserFeedbacks().some((f) => f.id === fb.id)).toBe(true);

      deleteUserFeedback(fb.id);
      expect(getUserFeedbacks().some((f) => f.id === fb.id)).toBe(false);
    });
  });

  describe('Journaling Activity Integration', () => {
    it('aggregates entry count, today entries, words and moods from repo', async () => {
      await testRepo.createEntry({
        title: 'Sáng an lành',
        body: 'Mỗi buổi sáng là một khởi đầu mới tràn ngập ánh sáng.',
        mood: 'hopeful',
      });
      await testRepo.createEntry({
        title: 'Chiều tĩnh lặng',
        body: 'Gió nhẹ thoảng qua từng kẽ lá.',
        mood: 'calm',
      });

      const stats = await getUserAnalyticsSummary({ repo: testRepo });
      expect(stats.journaling.totalEntries).toBe(2);
      expect(stats.journaling.entriesToday).toBe(2);
      expect(stats.journaling.totalWords).toBeGreaterThan(10);
      expect(stats.journaling.averageWordsPerEntry).toBeGreaterThan(0);
      expect(stats.journaling.moodBreakdown.hopeful).toBe(1);
      expect(stats.journaling.moodBreakdown.calm).toBe(1);
    });
  });
});
