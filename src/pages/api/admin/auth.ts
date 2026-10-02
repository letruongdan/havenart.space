import type { APIRoute } from 'astro';
import { authenticateUser } from '../../../lib/server/db';
import { verifyAdminRequest } from '../../../lib/server/admin-auth';
import { extractClientInfo } from '../../../lib/server/client-info';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu quản trị.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clientInfo = extractClientInfo(request, clientAddress);
    const auth = authenticateUser(username, password, clientInfo);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Tên đăng nhập hoặc mật khẩu quản trị không chính xác.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cookieHeader = `haven_admin_token=${encodeURIComponent(auth.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;

    return new Response(
      JSON.stringify({
        success: true,
        admin: {
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          role: auth.user.role,
        },
        token: auth.token,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi xác thực quản trị' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ request }) => {
  const admin = verifyAdminRequest(request);
  if (!admin) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const DELETE: APIRoute = async () => {
  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'haven_admin_token=; Path=/; HttpOnly; Max-Age=0',
      },
    }
  );
};
