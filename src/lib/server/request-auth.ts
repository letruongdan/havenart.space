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
  return (!origin || origin === new URL(request.url).origin) && request.headers.get('sec-fetch-site') !== 'cross-site';
}
