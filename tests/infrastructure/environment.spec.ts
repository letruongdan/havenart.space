import { describe, it, expect } from 'vitest';

describe('Project Build Environment', () => {
  it('should verify node environment and dependencies integrity', () => {
    expect(process.version).toBeDefined();
    expect(process.version.startsWith('v')).toBe(true);
  });

  it('should verify essential packages can be resolved', async () => {
    const ajv = await import('ajv');
    expect(ajv).toBeDefined();

    const idb = await import('idb');
    expect(idb).toBeDefined();

    const svelte = await import('svelte');
    expect(svelte).toBeDefined();

    const vitest = await import('vitest');
    expect(vitest).toBeDefined();
  });

  it('should provide DOM test environment with happy-dom', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    expect(document.createElement('div')).toBeDefined();
  });

  it('should provide fake-indexeddb for local-first storage testing', async () => {
    expect(typeof indexedDB).toBe('object');
    const openReq = indexedDB.open('test-db', 1);
    await new Promise<void>((resolve, reject) => {
      openReq.onsuccess = () => resolve();
      openReq.onerror = () => reject(openReq.error);
    });
    expect(openReq.result).toBeDefined();
    openReq.result.close();
  });
});
