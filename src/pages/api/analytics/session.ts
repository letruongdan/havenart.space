import type { APIRoute } from 'astro';
import { recordServerSession } from '../../../lib/server/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionId, durationSeconds, pageViews, device, browser, os, language, userId } = body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu sessionId.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine client IP from headers if available
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'client';

    const recorded = recordServerSession({
      sessionId,
      durationSeconds: Number(durationSeconds) || 0,
      pageViews: Number(pageViews) || 1,
      device: device === 'mobile' || device === 'tablet' ? device : 'desktop',
      browser,
      os,
      language,
      userId,
      ip: ip.replace(/:/g, '.'),
    });

    return new Response(
      JSON.stringify({ success: true, session: { id: recorded.id, duration: recorded.durationSeconds } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi ghi nhận phiên' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
