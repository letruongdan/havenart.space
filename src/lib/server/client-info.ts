/**
 * Client Information & Telemetry Extractor for Haven Art
 * Extracts IP, Browser, Version, OS, Device, and Language from HTTP Requests.
 */

export interface ClientInfo {
  ip: string;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  device: 'desktop' | 'mobile' | 'tablet';
  language: string;
}

export function extractClientInfo(request: Request, clientAddress?: string): ClientInfo {
  // 1. Extract IP address
  let ip = '';
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    ip = xForwardedFor.split(',')[0].trim();
  } else {
    ip = request.headers.get('x-real-ip') || clientAddress || '127.0.0.1';
  }

  // 2. Extract User-Agent header
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // 3. Extract Language
  const acceptLang = request.headers.get('accept-language');
  const language = acceptLang ? acceptLang.split(',')[0].trim() : 'vi-VN';

  // 4. Detect Device Type
  let device: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/ipad|tablet|kindle|playbook|silk/i.test(userAgent)) {
    device = 'tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(userAgent)) {
    device = 'mobile';
  } else {
    device = 'desktop';
  }

  // 5. Detect Operating System
  let os = 'Unknown OS';
  if (/windows nt 10/i.test(userAgent)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(userAgent)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(userAgent)) os = 'Windows 7';
  else if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/mac os x/i.test(userAgent)) {
    os = /iphone|ipad|ipod/i.test(userAgent) ? 'iOS' : 'macOS';
  } else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else if (/cros/i.test(userAgent)) os = 'ChromeOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  // 6. Detect Browser & Version
  let browser = 'Unknown Browser';
  let browserVersion = '';

  if (/edg\/([0-9.]+)/i.test(userAgent)) {
    browser = 'Microsoft Edge';
    browserVersion = userAgent.match(/edg\/([0-9.]+)/i)?.[1]?.split('.')[0] || '';
  } else if (/coc_coc_browser\/([0-9.]+)/i.test(userAgent)) {
    browser = 'Cốc Cốc';
    browserVersion = userAgent.match(/coc_coc_browser\/([0-9.]+)/i)?.[1]?.split('.')[0] || '';
  } else if (/chrome\/([0-9.]+)/i.test(userAgent) && !/edg/i.test(userAgent)) {
    browser = 'Google Chrome';
    browserVersion = userAgent.match(/chrome\/([0-9.]+)/i)?.[1]?.split('.')[0] || '';
  } else if (/firefox\/([0-9.]+)/i.test(userAgent)) {
    browser = 'Mozilla Firefox';
    browserVersion = userAgent.match(/firefox\/([0-9.]+)/i)?.[1]?.split('.')[0] || '';
  } else if (/version\/([0-9.]+).*safari/i.test(userAgent)) {
    browser = 'Apple Safari';
    browserVersion = userAgent.match(/version\/([0-9.]+).*safari/i)?.[1]?.split('.')[0] || '';
  } else if (/opera|opr\/([0-9.]+)/i.test(userAgent)) {
    browser = 'Opera';
    browserVersion = userAgent.match(/opera|opr\/([0-9.]+)/i)?.[1]?.split('.')[0] || '';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = 'Apple Safari';
  }

  return {
    ip,
    userAgent,
    browser,
    browserVersion,
    os,
    device,
    language,
  };
}
