import type { APIRoute } from 'astro';
import { getAllServerEntries, deleteServerEntry, purgeSoftDeletedEntries } from '../../../lib/server/db';
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
    const entries = getAllServerEntries();
    return new Response(
      JSON.stringify({ success: true, entries }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi lấy bài viết' }),
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
    const { id, purge } = body || {};

    if (purge) {
      const purged = purgeSoftDeletedEntries();
      return new Response(
        JSON.stringify({ success: true, purgedCount: purged }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu ID bài viết.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    deleteServerEntry(id);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi thao tác bài viết' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
