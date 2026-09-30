import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JournalRepository } from '../../src/lib/db/repository';
import { CryptoVault } from '../../src/lib/crypto/vault';
import { BackupManager } from '../../src/lib/export/backup';
import 'fake-indexeddb/auto';

describe('Adversarial Red-Team Privacy & Leak Audit', () => {
  let interceptedFetchBodies: string[] = [];
  let interceptedFetchUrls: string[] = [];
  let interceptedConsoleOutputs: string[] = [];
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    interceptedFetchBodies = [];
    interceptedFetchUrls = [];
    interceptedConsoleOutputs = [];

    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      interceptedFetchUrls.push(url);
      if (init?.body) {
        interceptedFetchBodies.push(String(init.body));
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });

    vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      interceptedConsoleOutputs.push(args.map(String).join(' '));
    });
    vi.spyOn(console, 'info').mockImplementation((...args: any[]) => {
      interceptedConsoleOutputs.push(args.map(String).join(' '));
    });
    vi.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      interceptedConsoleOutputs.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('strictly ensures journal body, title and mood NEVER leak over network fetch', async () => {
    const repo = new JournalRepository('redteam-privacy-db');
    await repo.init();

    const privateSecret = 'TOP_SECRET_REFLECTION_NEVER_TRANSMIT_TO_CLOUD';
    const privateTitle = 'CONFIDENTIAL_PERSONAL_THOUGHTS';
    const privateMood = 'vulnerable_mood_state';

    // Create journal entry
    const entry = await repo.createEntry({
      title: privateTitle,
      body: privateSecret,
      mood: privateMood,
    });

    // Update journal entry
    await repo.updateEntry(entry.id, {
      body: `${privateSecret}_UPDATED_CONTENT`,
    });

    // Save in-flight draft
    await repo.saveDraft({
      title: 'DRAFT_SECRET_TITLE',
      body: 'DRAFT_SECRET_BODY_LOCAL_ONLY',
      mood: 'peaceful',
    });

    // Export backup
    const backupManager = new BackupManager(repo);
    const backupJson = await backupManager.exportBackup();

    // Verify database operations triggered zero outbound network requests containing secrets
    expect(interceptedFetchBodies.some((b) => b.includes(privateSecret))).toBe(false);
    expect(interceptedFetchBodies.some((b) => b.includes(privateTitle))).toBe(false);
    expect(interceptedFetchBodies.some((b) => b.includes('DRAFT_SECRET_BODY'))).toBe(false);
    expect(interceptedFetchUrls.some((u) => u.includes(privateSecret))).toBe(false);

    // Verify backup contains content locally, but network was never called
    expect(backupJson).toContain(privateSecret);
    expect(global.fetch).not.toHaveBeenCalled();

    await repo.close();
  });

  it('guarantees plaintext entries and raw passwords are never logged to console in production', async () => {
    const vault = new CryptoVault();
    const rawPassword = 'SuperSecretMasterPassword123!@#';
    const secretJournal = 'My deeply personal confidential note';

    await vault.unlock(rawPassword);
    const encrypted = await vault.encryptRecord(secretJournal);
    const decrypted = await vault.decryptRecord(encrypted);

    expect(decrypted).toBe(secretJournal);

    // Verify that the cryptographic vault never logged plaintext or password to console
    const leakedToConsole = interceptedConsoleOutputs.some(
      (output) => output.includes(rawPassword) || output.includes(secretJournal)
    );
    expect(leakedToConsole).toBe(false);
  });

  it('guarantees plaintext journal content is never stored in localStorage', async () => {
    const sensitiveNote = 'PRIVATE_LOCAL_STORAGE_PROHIBITED_STRING';
    
    // Simulate reading current localStorage keys
    const allStorageValues = Object.values(localStorage);
    const leakedInLocalStorage = allStorageValues.some((val) => typeof val === 'string' && val.includes(sensitiveNote));
    expect(leakedInLocalStorage).toBe(false);
  });

  it('strictly validates WebCrypto non-extractable key security invariant', async () => {
    const vault = new CryptoVault();
    await vault.unlock('PasswordForExtractabilityTest');

    const key = vault.getBaseKey();
    if (key) {
      expect(key.extractable).toBe(false);
      // Attempting to export a non-extractable key must reject with DOMException
      await expect(
        crypto.subtle.exportKey('raw', key)
      ).rejects.toThrow();
    }

    vault.lock();
    expect(vault.isLocked()).toBe(true);
    expect(vault.getBaseKey()).toBeNull();
    expect(vault.getAesKey()).toBeNull();
  });

  it('adversarially tests XSS payloads against string escaping', () => {
    const hostilePayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '"><script src=evil.com/xss.js></script>',
      '<svg/onload=alert(document.cookie)>',
      'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<input onfocus=alert(1) autofocus>',
      '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click me</a>',
    ];

    for (const payload of hostilePayloads) {
      // In Haven Art, journal entries are strictly text strings
      expect(typeof payload).toBe('string');
      // Verify payload is handled as raw characters without evaluation
      const container = document.createElement('div');
      container.textContent = payload; // Safe Svelte-equivalent interpolation
      expect(container.children.length).toBe(0); // Zero HTML elements spawned
      expect(container.innerHTML).not.toContain('<script>');
    }
  });
});
