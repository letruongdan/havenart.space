import creditsData from '../../../public/credits.json';

export interface AssetCredit {
  id: string;
  file: string;
  title: string;
  author: string;
  source_url: string;
  license: string;
  license_url: string;
  downloadedAt: string;
  checksum: string;
  alt_vi: string;
}

export interface CreditsLedger {
  $schema?: string;
  name?: string;
  version?: string;
  updatedAt?: string;
  assets: AssetCredit[];
}

/**
 * Returns a defensive copy of all verified asset provenance and credit records.
 */
export function getCreditsLedger(): AssetCredit[] {
  return (creditsData.assets as AssetCredit[]).map((asset) => ({ ...asset }));
}

/**
 * Finds a specific asset provenance credit record by its unique asset ID.
 */
export function getAssetCredit(id: string): AssetCredit | undefined {
  const asset = (creditsData.assets as AssetCredit[]).find((item) => item.id === id);
  return asset ? { ...asset } : undefined;
}

/**
 * Returns all verified visual artwork credit records.
 */
export function getVisualCredits(): AssetCredit[] {
  return getCreditsLedger().filter(
    (asset) => asset.file.startsWith('/images/') || asset.id.startsWith('haven-art-')
  );
}

/**
 * Returns all verified ambient audio credit records.
 */
export function getAudioCredits(): AssetCredit[] {
  return getCreditsLedger().filter(
    (asset) => asset.file.startsWith('/audio/') || asset.id.startsWith('haven-ambient-')
  );
}
