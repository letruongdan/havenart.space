import type { APIRoute } from 'astro';
import {
  getAllUsers,
  getUserLoginHistory,
  getRecentLoginHistory,
  updateUserStatus,
  updateUserRole,
  resetUserPassword,
  deleteUser,
} from '../../../lib/server/db';
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
    const url = new URL(request.url);
    const historyUserId = url.searchParams.get('history');
    const recentHistory = url.searchParams.get('recentHistory');

    if (historyUserId) {
      const history = getUserLoginHistory(historyUserId);
      return new Response(
        JSON.stringify({ success: true, history }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (recentHistory === 'true' || recentHistory === '1') {
      const history = getRecentLoginHistory();
      return new Response(
        JSON.stringify({ success: true, history }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const users = getAllUsers();
    return new Response(
      JSON.stringify({ success: true, users }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi lấy danh sách người dùng' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const admin = verifyAdminRequest(request);
  if (!admin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Yêu cầu quyền quản trị viên.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { id, status, role, newPassword } = body || {};

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu ID người dùng.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (status) {
      updateUserStatus(id, status);
    }
    if (role) {
      updateUserRole(id, role);
    }
    if (newPassword) {
      resetUserPassword(id, newPassword);
    }

    const updatedUsers = getAllUsers();
    return new Response(
      JSON.stringify({ success: true, users: updatedUsers }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi cập nhật người dùng' }),
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
        JSON.stringify({ success: false, error: 'Thiếu ID người dùng.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    deleteUser(id);
    const updatedUsers = getAllUsers();

    return new Response(
      JSON.stringify({ success: true, users: updatedUsers }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi xóa người dùng' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
