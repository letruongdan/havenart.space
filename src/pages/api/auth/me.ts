import type { APIRoute } from 'astro';
import { findUserByToken, getUserServerEntries } from '../../../lib/server/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chưa đăng nhập.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = findUserByToken(token);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const entries = getUserServerEntries(user.id);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        serverEntryCount: entries.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi kiểm tra phiên đăng nhập' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
