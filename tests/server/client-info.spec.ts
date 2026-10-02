import { describe, it, expect } from 'vitest';
import { extractClientInfo } from '../../src/lib/server/client-info';

describe('Client Information Extractor', () => {
  it('extracts desktop Chrome on Windows correctly', () => {
    const req = new Request('http://localhost:4321/api/test', {
      headers: {
        'x-forwarded-for': '14.241.12.88, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const info = extractClientInfo(req);
    expect(info.ip).toBe('14.241.12.88');
    expect(info.browser).toBe('Google Chrome');
    expect(info.browserVersion).toBe('124');
    expect(info.os).toBe('Windows 10/11');
    expect(info.device).toBe('desktop');
    expect(info.language).toBe('vi-VN');
  });

  it('extracts mobile Safari on iPhone correctly', () => {
    const req = new Request('http://localhost:4321/api/test', {
      headers: {
        'x-real-ip': '118.69.182.20',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      },
    });

    const info = extractClientInfo(req);
    expect(info.ip).toBe('118.69.182.20');
    expect(info.browser).toBe('Apple Safari');
    expect(info.browserVersion).toBe('17');
    expect(info.os).toBe('iOS');
    expect(info.device).toBe('mobile');
  });

  it('extracts Edge browser and tablet device correctly', () => {
    const req = new Request('http://localhost:4321/api/test', {
      headers: {
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Edg/120.0.0.0 Safari/605.1.15',
      },
    });

    const info = extractClientInfo(req, '192.168.1.100');
    expect(info.ip).toBe('192.168.1.100');
    expect(info.browser).toBe('Microsoft Edge');
    expect(info.browserVersion).toBe('120');
    expect(info.device).toBe('tablet');
  });
});
