/**
 * Haven Art Cryptography Types & Contracts
 * WebCrypto AES-GCM-256 and PBKDF2-SHA256 definitions.
 */

export interface EncryptedRecord {
  /** Base64-encoded AES-GCM ciphertext including the 16-byte authentication tag */
  ciphertext: string;
  /** 12-byte unique random initialization vector */
  iv: Uint8Array;
  /** 16-byte cryptographic salt used in PBKDF2 derivation */
  salt: Uint8Array;
  /** Format specification version (default: 1) */
  version: number;
  /** Cipher suite identifier */
  algorithm: 'AES-GCM-256';
}

export interface SerializedEncryptedRecord {
  /** Base64-encoded ciphertext including auth tag */
  ciphertext: string;
  /** Base64-encoded 12-byte IV */
  iv: string;
  /** Base64-encoded 16-byte salt */
  salt: string;
  /** Format specification version */
  version: number;
  /** Cipher suite identifier */
  algorithm: 'AES-GCM-256';
}

export interface VaultOptions {
  /** Custom salt (16 bytes Uint8Array or base64 string) */
  salt?: Uint8Array | string;
  /** PBKDF2 iterations count (defaults to 100,000) */
  iterations?: number;
  /** Cryptographic format version (default: 1) */
  version?: number;
}
