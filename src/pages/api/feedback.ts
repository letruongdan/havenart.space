import type { APIRoute } from 'astro';
import { addServerFeedback, findUserByToken, getAllServerFeedbacks, getFeedbackStats } from '../../lib/server/db';
import { requestToken } from '../../lib/server/request-auth';
import { extractClientInfo } from '../../lib/server/client-info';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { rating, category, comment, userId, userName, userEmail, device } = body || {};

    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || (comment && (typeof comment !== 'string' || comment.length > 5000))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Đánh giá phải là số từ 1 đến 5 sao.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clientInfo = extractClientInfo(request, clientAddress);

    const user = findUserByToken(requestToken(request));
    const saved = addServerFeedback({
      rating,
      category,
      comment: (comment && typeof comment === 'string') ? comment : '',
      userId: user?.id || null,
      userName: user?.name || 'Người bạn Haven Art',
      userEmail: user?.email,
      device: device || clientInfo.device,
      clientInfo,
    });

    const stats = getFeedbackStats();

    return new Response(
      JSON.stringify({
        success: true,
        feedback: saved,
        stats,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi lưu đánh giá' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  try {
    const feedbacks = getAllServerFeedbacks(50).map((f) => ({
      id: f.id,
      userName: f.userName,
      rating: f.rating,
      category: f.category,
      comment: f.comment,
      createdAt: f.createdAt,
    }));
    const stats = getFeedbackStats();

    return new Response(
      JSON.stringify({ success: true, stats, feedbacks }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi tải đánh giá' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
