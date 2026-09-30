/**
 * Haven Art - WebCrypto Password Lock & Vault Wrapper
 * 
 * Security Core:
 * 1. AES-GCM 256-bit encryption.
 * 2. Unique random 12-byte IV per encryption call.
 * 3. 16-byte random salt for PBKDF2.
 * 4. PBKDF2-SHA256 with 100,000 rounds.
 * 5. CryptoKey non-extractable (extractable: false).
 * 6. Key stored ONLY in RAM instance variables, never persisted.
 * 7. Zero logging of plaintext.
 * 8. Base64/JSON persistence and export serialization.
 */

import type {
  EncryptedRecord,
  SerializedEncryptedRecord,
  VaultOptions
} from './types';

const DEFAULT_ITERATIONS = 100000;
const DEFAULT_VERSION = 1;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT_LENGTH = 16; // 128 bits for PBKDF2

function getCrypto(): Crypto {
  const cryptoObj = typeof window !== 'undefined' && window.crypto
    ? window.crypto
    : (globalThis as any).crypto;
  if (!cryptoObj) {
    throw new Error('WebCrypto API is not available in the current environment');
  }
  return cryptoObj;
}

function getSubtleCrypto(): SubtleCrypto {
  const cryptoObj = getCrypto();
  if (!cryptoObj.subtle) {
    throw new Error('SubtleCrypto API (crypto.subtle) is not available');
  }
  return cryptoObj.subtle;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function areUint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Serializes an EncryptedRecord to a compact JSON string suitable for IndexedDB or backup export.
 */
export function serializeEncryptedRecord(record: EncryptedRecord): string {
  const serialized: SerializedEncryptedRecord = {
    ciphertext: record.ciphertext,
    iv: uint8ArrayToBase64(record.iv),
    salt: uint8ArrayToBase64(record.salt),
    version: record.version,
    algorithm: record.algorithm
  };
  return JSON.stringify(serialized);
}

/**
 * Deserializes a JSON string into a strongly-typed EncryptedRecord.
 */
export function deserializeEncryptedRecord(serialized: string): EncryptedRecord {
  const parsed = JSON.parse(serialized);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid serialized encrypted record');
  }
  if (
    typeof parsed.ciphertext !== 'string' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.salt !== 'string'
  ) {
    throw new Error('Malformed encrypted record: missing required fields');
  }
  return {
    ciphertext: parsed.ciphertext,
    iv: base64ToUint8Array(parsed.iv),
    salt: base64ToUint8Array(parsed.salt),
    version: typeof parsed.version === 'number' ? parsed.version : DEFAULT_VERSION,
    algorithm: parsed.algorithm || 'AES-GCM-256'
  };
}

export class CryptoVault {
  // Non-extractable CryptoKeys held strictly in RAM within instance variables
  private aesKey: CryptoKey | null = null;
  private baseKey: CryptoKey | null = null;
  private salt: Uint8Array;
  private readonly iterations: number;
  private readonly version: number;
  private locked: boolean = true;

  constructor(options?: VaultOptions) {
    this.iterations = options?.iterations ?? DEFAULT_ITERATIONS;
    this.version = options?.version ?? DEFAULT_VERSION;

    if (options?.salt) {
      this.salt = typeof options.salt === 'string'
        ? base64ToUint8Array(options.salt)
        : new Uint8Array(options.salt);
    } else {
      this.salt = getCrypto().getRandomValues(new Uint8Array(SALT_LENGTH));
    }
  }

  /**
   * Checks whether the vault is locked.
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Returns a copy of the vault's current PBKDF2 salt.
   */
  getSalt(): Uint8Array {
    return new Uint8Array(this.salt);
  }

  /**
   * Locks the vault immediately, wiping all CryptoKey references from RAM.
   */
  lock(): void {
    this.aesKey = null;
    this.baseKey = null;
    this.locked = true;
  }

  /**
   * Derives a non-extractable 256-bit AES-GCM key from password and salt via PBKDF2-SHA256.
   */
  async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number = DEFAULT_ITERATIONS
  ): Promise<CryptoKey> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    const subtle = getSubtleCrypto();
    const baseKey = await subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false, // non-extractable
      ['deriveKey']
    );

    return await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Unlocks the vault using the user password, deriving non-extractable keys in RAM.
   */
  async unlock(password: string, customSalt?: Uint8Array | string): Promise<void> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (customSalt) {
      this.salt = typeof customSalt === 'string'
        ? base64ToUint8Array(customSalt)
        : new Uint8Array(customSalt);
    }

    const subtle = getSubtleCrypto();
    this.baseKey = await subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    this.aesKey = await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      this.baseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );

    this.locked = false;
  }

  /**
   * Encrypts plaintext using AES-GCM-256 with a unique random 12-byte IV.
   */
  async encryptRecord(plaintext: string): Promise<EncryptedRecord> {
    if (this.locked || !this.aesKey) {
      throw new Error('Vault is locked. Call unlock() with password first.');
    }

    const iv = getCrypto().getRandomValues(new Uint8Array(IV_LENGTH));
    const subtle = getSubtleCrypto();
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      this.aesKey,
      encoded
    );

    return {
      ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
      iv,
      salt: new Uint8Array(this.salt),
      version: this.version,
      algorithm: 'AES-GCM-256'
    };
  }

  /**
   * Decrypts an encrypted record or serialized string.
   */
  async decryptRecord(
    record: EncryptedRecord | SerializedEncryptedRecord | string
  ): Promise<string> {
    if (this.locked || !this.aesKey) {
      throw new Error('Vault is locked. Call unlock() with password first.');
    }

    let parsed: EncryptedRecord;
    if (typeof record === 'string') {
      parsed = deserializeEncryptedRecord(record);
    } else {
      parsed = {
        ciphertext: record.ciphertext,
        iv: record.iv instanceof Uint8Array ? record.iv : base64ToUint8Array(record.iv),
        salt: record.salt instanceof Uint8Array ? record.salt : base64ToUint8Array(record.salt),
        version: record.version ?? this.version,
        algorithm: record.algorithm ?? 'AES-GCM-256'
      };
    }

    const subtle = getSubtleCrypto();
    let keyToUse = this.aesKey;

    // If the record was encrypted with a distinct salt, derive temporary key using in-memory baseKey
    if (!areUint8ArraysEqual(parsed.salt, this.salt) && this.baseKey) {
      keyToUse = await subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: parsed.salt,
          iterations: this.iterations,
          hash: 'SHA-256'
        },
        this.baseKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt', 'decrypt']
      );
    }

    try {
      const decryptedBuffer = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: parsed.iv
        },
        keyToUse,
        base64ToUint8Array(parsed.ciphertext)
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch {
      throw new Error('Decryption failed: invalid password or corrupted data');
    }
  }

  /**
   * Re-encrypts an array of records under a new password atomically.
   * If any record fails to decrypt with the old password, rotation aborts with zero side effects.
   */
  async rotatePassword(
    oldPassword: string,
    newPassword: string,
    records: Array<EncryptedRecord | SerializedEncryptedRecord | string>
  ): Promise<EncryptedRecord[]> {
    if (!oldPassword || typeof oldPassword !== 'string') {
      throw new Error('Old password must be a non-empty string');
    }
    if (!newPassword || typeof newPassword !== 'string') {
      throw new Error('New password must be a non-empty string');
    }

    const subtle = getSubtleCrypto();
    const plaintexts: string[] = [];
    const derivedKeysBySalt = new Map<string, CryptoKey>();

    // Phase 1: Decrypt and verify all records atomically
    for (const rec of records) {
      const norm: EncryptedRecord = typeof rec === 'string'
        ? deserializeEncryptedRecord(rec)
        : {
            ciphertext: rec.ciphertext,
            iv: rec.iv instanceof Uint8Array ? rec.iv : base64ToUint8Array(rec.iv),
            salt: rec.salt instanceof Uint8Array ? rec.salt : base64ToUint8Array(rec.salt),
            version: rec.version ?? this.version,
            algorithm: rec.algorithm ?? 'AES-GCM-256'
          };

      try {
        const saltB64 = uint8ArrayToBase64(norm.salt);
        let oldKey = derivedKeysBySalt.get(saltB64);
        if (!oldKey) {
          oldKey = await this.deriveKey(oldPassword, norm.salt, this.iterations);
          derivedKeysBySalt.set(saltB64, oldKey);
        }

        const decryptedBuf = await subtle.decrypt(
          { name: 'AES-GCM', iv: norm.iv },
          oldKey,
          base64ToUint8Array(norm.ciphertext)
        );
        plaintexts.push(new TextDecoder().decode(decryptedBuf));
      } catch {
        throw new Error('Password rotation aborted: old password failed to decrypt record.');
      }
    }

    // Phase 2: Derive new key with brand-new random 16-byte salt
    const newSalt = getCrypto().getRandomValues(new Uint8Array(SALT_LENGTH));
    const newBaseKey = await subtle.importKey(
      'raw',
      new TextEncoder().encode(newPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const newAesKey = await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: newSalt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      newBaseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );

    // Phase 3: Re-encrypt all records with fresh random IVs
    const reEncrypted: EncryptedRecord[] = [];
    for (const text of plaintexts) {
      const iv = getCrypto().getRandomValues(new Uint8Array(IV_LENGTH));
      const buf = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        newAesKey,
        new TextEncoder().encode(text)
      );
      reEncrypted.push({
        ciphertext: uint8ArrayToBase64(new Uint8Array(buf)),
        iv,
        salt: new Uint8Array(newSalt),
        version: this.version,
        algorithm: 'AES-GCM-256'
      });
    }

    // Phase 4: Commit new vault state
    this.salt = newSalt;
    this.baseKey = newBaseKey;
    this.aesKey = newAesKey;
    this.locked = false;

    return reEncrypted;
  }

  /**
   * Alias for rotatePassword.
   */
  async rotateKey(
    oldPassword: string,
    newPassword: string,
    records: Array<EncryptedRecord | SerializedEncryptedRecord | string>
  ): Promise<EncryptedRecord[]> {
    return this.rotatePassword(oldPassword, newPassword, records);
  }
}
