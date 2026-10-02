import type { APIRoute } from 'astro';
import { recordServerSession } from '../../../lib/server/db';
import { extractClientInfo } from '../../../lib/server/client-info';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { sessionId, durationSeconds, pageViews, device, browser, os, language, userId } = body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu sessionId.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clientInfo = extractClientInfo(request, clientAddress);

    const recorded = recordServerSession({
      sessionId,
      durationSeconds: Number(durationSeconds) || 0,
      pageViews: Number(pageViews) || 1,
      device: (device === 'mobile' || device === 'tablet' || device === 'desktop') ? device : clientInfo.device,
      browser: browser || clientInfo.browser,
      browserVersion: clientInfo.browserVersion,
      os: os || clientInfo.os,
      language: language || clientInfo.language,
      userId,
      ip: clientInfo.ip,
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
