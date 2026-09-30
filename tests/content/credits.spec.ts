import { describe, it, expect } from 'vitest';
import credits from '../../public/credits.json';
import {
  getCreditsLedger,
  getAssetCredit,
  getVisualCredits,
  getAudioCredits,
  type AssetCredit,
} from '../../src/lib/content/credits';
import { getAllArtworks, CURATED_ARTWORKS } from '../../src/lib/visuals/controller';
import { getAllTracks, DEFAULT_TRACKS } from '../../src/lib/audio/tracks';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

describe('Asset Provenance & Credits Ledger (Task 11)', () => {
  describe('1. Schema & Required Fields Integrity', () => {
    it('contains a non-empty assets array in credits.json', () => {
      expect(credits).toBeDefined();
      expect(Array.isArray(credits.assets)).toBe(true);
      expect(credits.assets.length).toBeGreaterThan(0);
    });

    it('ensures every asset has all required fields with valid formats', () => {
      const httpsRegex = /^https:\/\//;
      const sha256Regex = /^sha256:[a-f0-9]{64}$/i;
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}/;

      for (const asset of credits.assets) {
        // id
        expect(typeof asset.id).toBe('string');
        expect(asset.id.trim().length).toBeGreaterThan(0);

        // file
        expect(typeof asset.file).toBe('string');
        expect(asset.file.startsWith('/')).toBe(true);

        // title
        expect(typeof asset.title).toBe('string');
        expect(asset.title.trim().length).toBeGreaterThan(0);

        // author
        expect(typeof asset.author).toBe('string');
        expect(asset.author.trim().length).toBeGreaterThan(0);

        // source_url
        expect(typeof asset.source_url).toBe('string');
        expect(asset.source_url).toMatch(httpsRegex);

        // license
        expect(typeof asset.license).toBe('string');
        expect(asset.license.trim().length).toBeGreaterThan(0);

        // license_url
        expect(typeof asset.license_url).toBe('string');
        expect(asset.license_url).toMatch(httpsRegex);

        // downloadedAt
        expect(typeof asset.downloadedAt).toBe('string');
        expect(asset.downloadedAt).toMatch(isoDateRegex);

        // checksum
        expect(typeof asset.checksum).toBe('string');
        expect(asset.checksum).toMatch(sha256Regex);

        // alt_vi
        expect(typeof asset.alt_vi).toBe('string');
        expect(asset.alt_vi.trim().length).toBeGreaterThan(0);
      }
    });

    it('ensures all asset IDs in credits.json are unique', () => {
      const ids = credits.assets.map((a: any) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('2. Visual Catalog License Coverage', () => {
    it('covers 100% of artworks from VisualController / CURATED_ARTWORKS', () => {
      const artworks = getAllArtworks();
      expect(artworks.length).toBeGreaterThan(0);

      for (const art of artworks) {
        const credit = credits.assets.find((a: any) => a.id === art.id);
        expect(
          credit,
          `Artwork ${art.id} must have a verified license record in credits.json`
        ).toBeDefined();

        expect(credit!.title).toBe(art.title);
        expect(credit!.author).toBe(art.artist);
        expect(credit!.file).toBe(art.src);
        expect(credit!.license).toBe(art.license);
      }
    });

    it('verifies SHA-256 checksums match physical files for existing public images', () => {
      for (const art of CURATED_ARTWORKS) {
        const credit = credits.assets.find((a: any) => a.id === art.id);
        expect(credit).toBeDefined();

        const filePath = path.resolve(process.cwd(), 'public', art.src.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const computedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          const expectedChecksum = `sha256:${computedHash}`;
          expect(credit!.checksum.toLowerCase()).toBe(expectedChecksum.toLowerCase());
        }
      }
    });
  });

  describe('3. Audio Catalog License Coverage', () => {
    it('covers 100% of audio tracks from AudioEngine / DEFAULT_TRACKS', () => {
      const tracks = getAllTracks();
      expect(tracks.length).toBeGreaterThan(0);

      for (const track of tracks) {
        const credit = credits.assets.find((a: any) => a.id === track.id);
        expect(
          credit,
          `Audio track ${track.id} must have a verified license record in credits.json`
        ).toBeDefined();

        expect(credit!.title).toBe(track.title);
        expect(credit!.author).toBe(track.artist);
        expect(credit!.file).toBe(track.src);
        expect(credit!.license).toMatch(/CC0/i);
      }
    });
  });

  describe('4. Credits Helper Library (src/lib/content/credits.ts)', () => {
    it('getCreditsLedger returns all assets defensively', () => {
      const ledger = getCreditsLedger();
      expect(ledger.length).toBe(credits.assets.length);
      expect(ledger).toEqual(credits.assets);

      // Verify immutability
      const len = ledger.length;
      ledger.pop();
      expect(getCreditsLedger().length).toBe(len);
    });

    it('getAssetCredit finds existing asset or returns undefined', () => {
      const art = CURATED_ARTWORKS[0];
      const credit = getAssetCredit(art.id);
      expect(credit).toBeDefined();
      expect(credit?.id).toBe(art.id);
      expect(credit?.title).toBe(art.title);

      const nonExistent = getAssetCredit('non-existent-id-12345');
      expect(nonExistent).toBeUndefined();
    });

    it('getVisualCredits filters exactly visual artwork assets', () => {
      const visuals = getVisualCredits();
      expect(visuals.length).toBe(CURATED_ARTWORKS.length);

      const artworkIds = new Set(CURATED_ARTWORKS.map((a) => a.id));
      for (const v of visuals) {
        expect(artworkIds.has(v.id)).toBe(true);
        expect(v.file).toMatch(/^\/images\//);
      }
    });

    it('getAudioCredits filters exactly audio track assets', () => {
      const audios = getAudioCredits();
      expect(audios.length).toBe(DEFAULT_TRACKS.length);

      const trackIds = new Set(DEFAULT_TRACKS.map((t) => t.id));
      for (const a of audios) {
        expect(trackIds.has(a.id)).toBe(true);
        expect(a.file).toMatch(/^\/audio\//);
      }
    });

    it('visual + audio partitions entire credits ledger without overlap', () => {
      const visuals = getVisualCredits();
      const audios = getAudioCredits();
      const ledger = getCreditsLedger();

      expect(visuals.length + audios.length).toBe(ledger.length);
      const visualIdSet = new Set(visuals.map((v) => v.id));
      for (const a of audios) {
        expect(visualIdSet.has(a.id)).toBe(false);
      }
    });
  });
});
