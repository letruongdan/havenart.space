import type { APIRoute } from 'astro';
import { authenticateUser, revokeToken, changeServerPassword } from '../../../lib/server/db';
import { verifyAdminRequest } from '../../../lib/server/admin-auth';
import { requestToken, sameOrigin } from '../../../lib/server/request-auth';
import { extractClientInfo } from '../../../lib/server/client-info';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!sameOrigin(request) || typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
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

    const cookieHeader = `haven_admin_token=${encodeURIComponent(auth.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;

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
      { status: err?.message?.includes('15 phút') ? 429 : 400, headers: { 'Content-Type': 'application/json' } }
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

export const DELETE: APIRoute = async ({request}) => {
  if (!sameOrigin(request)) return Response.json({success:false},{status:403});
  revokeToken(requestToken(request, 'haven_admin_token'));
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

export const PATCH: APIRoute = async ({request}) => {
  const admin = verifyAdminRequest(request);
  if (!admin) return Response.json({success:false,error:'Yêu cầu quyền quản trị.'},{status:401});
  try {
    const {currentPassword,newPassword} = await request.json();
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 12) return Response.json({success:false,error:'Mật khẩu mới phải có ít nhất 12 ký tự.'},{status:400});
    if (!changeServerPassword(admin.id,currentPassword,newPassword)) return Response.json({success:false,error:'Mật khẩu hiện tại không chính xác.'},{status:400});
    return Response.json({success:true},{headers:{'Set-Cookie':'haven_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'}});
  } catch { return Response.json({success:false,error:'Không thể đổi mật khẩu.'},{status:400}); }
};
