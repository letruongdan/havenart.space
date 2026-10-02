import type { APIRoute } from 'astro';
import { getServerAnalyticsSummary, getFeedbackStats, getServerDbStats } from '../../../lib/server/db';
import { verifyAdminRequest } from '../../../lib/server/admin-auth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const admin = verifyAdminRequest(request);
  if (!admin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Yêu cầu quyền quản trị viên.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const analytics = getServerAnalyticsSummary();
    const feedbackStats = getFeedbackStats();
    const dbStats = getServerDbStats();

    return new Response(
      JSON.stringify({
        success: true,
        analytics,
        feedbackStats,
        dbStats,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi thống kê máy chủ' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
