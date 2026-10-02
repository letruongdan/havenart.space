import type { APIRoute } from 'astro';
import { authenticateUser } from '../../../lib/server/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const auth = authenticateUser(email, password);
    if (!auth) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email hoặc mật khẩu không chính xác.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: auth.user.id,
          email: auth.user.email,
          name: auth.user.name,
          createdAt: auth.user.createdAt,
        },
        token: auth.token,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi xử lý đăng nhập' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
