import type { APIRoute } from 'astro';
import { findUserByToken, upsertServerEntries } from '../../../lib/server/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Yêu cầu đăng nhập để đồng bộ dữ liệu.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = findUserByToken(token);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phiên đăng nhập đã hết hạn.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const entries = Array.isArray(body?.entries) ? body.entries : [];

    const { syncedCount, totalCount } = upsertServerEntries(user.id, entries);

    return new Response(
      JSON.stringify({
        success: true,
        syncedCount,
        totalCount,
        syncedAt: Date.now(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi đồng bộ lên máy chủ' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
