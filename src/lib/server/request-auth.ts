export function requestToken(request: Request, cookieName?: string): string {
  const header = request.headers.get('authorization');
  if (header) return header.replace(/^Bearer\s+/i, '').trim();
  if (request.headers.get('x-admin-token')) return request.headers.get('x-admin-token')!.trim();
  if (!cookieName) return '';
  const cookie = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='));
  try { return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : ''; } catch { return ''; }
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;

  const requestUrl = new URL(request.url);
  if (origin === requestUrl.origin) return true;

  const proto = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
  if (origin === `${proto}://${host}`) return true;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host || originUrl.host === requestUrl.host) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
