import { pagination } from '../../../lib/server/pagination';
import type { APIRoute } from 'astro';
import { getAllServerFeedbacks, deleteServerFeedback, getFeedbackStats } from '../../../lib/server/db';
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
    const {limit,offset} = pagination(request);
    const feedbacks = getAllServerFeedbacks(limit+1,offset);
    const hasMore = feedbacks.length > limit;
    if (hasMore) feedbacks.pop();
    const stats = getFeedbackStats();
    return new Response(
      JSON.stringify({ success: true, feedbacks, stats }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi lấy phản hồi' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const admin = verifyAdminRequest(request);
  if (!admin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Yêu cầu quyền quản trị viên.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { id } = body || {};

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu ID phản hồi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    deleteServerFeedback(id);
    const {limit,offset} = pagination(request);
    const feedbacks = getAllServerFeedbacks(limit+1,offset);
    const hasMore = feedbacks.length > limit;
    if (hasMore) feedbacks.pop();
    const stats = getFeedbackStats();

    return new Response(
      JSON.stringify({ success: true, feedbacks, stats }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi xóa phản hồi' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
