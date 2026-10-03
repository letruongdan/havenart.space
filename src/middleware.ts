import { defineMiddleware } from 'astro:middleware';
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/api/') && Number(context.request.headers.get('content-length')) > 5 * 1024 * 1024) {
    return Response.json({success:false,error:'Yêu cầu quá lớn (tối đa 5 MB).'}, {status:413});
  }
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  if (context.url.pathname.startsWith('/api/')) response.headers.set('Cache-Control', 'no-store');
  return response;
});
