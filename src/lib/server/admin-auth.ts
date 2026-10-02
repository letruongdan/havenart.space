import { findUserByToken, type ServerUser } from './db';

/**
 * Extracts and verifies an admin user from the incoming HTTP request.
 */
export function verifyAdminRequest(request: Request): ServerUser | null {
  // 1. Check Authorization: Bearer <token>
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. Check X-Admin-Token header
  if (!token) {
    token = request.headers.get('x-admin-token') || '';
  }

  // 3. Check Cookie: haven_admin_token=<token>
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/haven_admin_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;

  const user = findUserByToken(token);
  if (!user || user.role !== 'admin' || user.status !== 'active') {
    return null;
  }

  return user;
}
