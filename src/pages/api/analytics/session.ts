import type { APIRoute } from 'astro';
import { recordServerSession, findUserByToken } from '../../../lib/server/db';
import { requestToken } from '../../../lib/server/request-auth';
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

    const user = findUserByToken(requestToken(request));
    const recorded = recordServerSession({
      sessionId,
      durationSeconds: Math.max(0,Math.min(86400,Number(durationSeconds) || 0)),
      pageViews: Math.max(1,Math.min(1000,Number(pageViews) || 1)),
      device: (device === 'mobile' || device === 'tablet' || device === 'desktop') ? device : clientInfo.device,
      browser: browser || clientInfo.browser,
      browserVersion: clientInfo.browserVersion,
      os: os || clientInfo.os,
      language: language || clientInfo.language,
      userId:user?.id || null,
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
