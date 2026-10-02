import type { APIRoute } from 'astro';
import { exportServerDatabase, importServerDatabase } from '../../../lib/server/db';
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
    const data = exportServerDatabase();
    const filename = `havenart-server-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi sao lưu máy chủ' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  const admin = verifyAdminRequest(request);
  if (!admin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Yêu cầu quyền quản trị viên.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const result = importServerDatabase(body);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Phục hồi CSDL thành công: ${result.usersImported} người dùng, ${result.entriesImported} bài viết, ${result.feedbacksImported} đánh giá.`,
        result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi phục hồi CSDL' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
