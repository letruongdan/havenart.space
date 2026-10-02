import type { APIRoute } from 'astro';
import { createServerUser, findUserByEmail } from '../../../lib/server/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password, name } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email không hợp lệ.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Mật khẩu phải có ít nhất 6 ký tự.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (findUserByEmail(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email này đã được sử dụng. Vui lòng đăng nhập.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { user, token } = createServerUser({
      email,
      name: (name && typeof name === 'string') ? name : email.split('@')[0],
      password,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi xử lý đăng ký' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
