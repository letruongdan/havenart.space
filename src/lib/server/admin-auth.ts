import { findUserByToken, type ServerUser } from './db';
import { requestToken, sameOrigin } from './request-auth';
export function verifyAdminRequest(request: Request): ServerUser | null {
  if (request.method !== 'GET' && !sameOrigin(request)) return null;
  const user = findUserByToken(requestToken(request, 'haven_admin_token'));
  return user?.role === 'admin' && user.status === 'active' ? user : null;
}
