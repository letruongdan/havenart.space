import { describe, it, expect } from 'vitest';
import { CryptoVault, serializeEncryptedRecord, deserializeEncryptedRecord } from '../../src/lib/crypto/vault';
import type { EncryptedRecord } from '../../src/lib/crypto/types';

describe('CryptoVault', () => {
  // Step 1 baseline test from Task 5 brief
  it('encrypts and decrypts text cleanly with password', async () => {
    const vault = new CryptoVault();
    await vault.unlock('MatKhauBiMat123@');

    const encrypted = await vault.encryptRecord('Nội dung nhật ký tuyệt mật');
    expect(encrypted.ciphertext).not.toContain('Nội dung');
    expect(encrypted.iv.length).toBe(12);

    const decrypted = await vault.decryptRecord(encrypted);
    expect(decrypted).toBe('Nội dung nhật ký tuyệt mật');
  });

  it('rejects wrong password without data corruption', async () => {
    const vault1 = new CryptoVault();
    await vault1.unlock('PasswordA');
    const encrypted = await vault1.encryptRecord('Thư viện Haven');

    const vault2 = new CryptoVault();
    await vault2.unlock('PasswordB');
    await expect(vault2.decryptRecord(encrypted)).rejects.toThrow();
  });

  it('generates a unique random 12-byte IV for every encryption call', async () => {
    const vault = new CryptoVault();
    await vault.unlock('SecurePassword#2026');

    const sampleText = 'Trời thu xanh ngát, lòng bình yên';
    const enc1 = await vault.encryptRecord(sampleText);
    const enc2 = await vault.encryptRecord(sampleText);

    expect(enc1.iv.length).toBe(12);
    expect(enc2.iv.length).toBe(12);

    // IVs must not match (probabilistically impossible for 96-bit random)
    const iv1Hex = Array.from(enc1.iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const iv2Hex = Array.from(enc2.iv).map(b => b.toString(16).padStart(2, '0')).join('');
    expect(iv1Hex).not.toBe(iv2Hex);

    // Ciphertexts must also differ due to unique IVs
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

    // Both must decrypt to the exact same plaintext
    expect(await vault.decryptRecord(enc1)).toBe(sampleText);
    expect(await vault.decryptRecord(enc2)).toBe(sampleText);
  });

  it('detects tampering and rejects corrupted ciphertext or IV', async () => {
    const vault = new CryptoVault();
    await vault.unlock('TamperTestPass123!');

    const original = await vault.encryptRecord('Dữ liệu không thể bị giả mạo');

    // Tamper with ciphertext by corrupting characters
    const tamperedCiphertextRecord: EncryptedRecord = {
      ...original,
      ciphertext: original.ciphertext.slice(0, -4) + 'AAAA'
    };
    await expect(vault.decryptRecord(tamperedCiphertextRecord)).rejects.toThrow();

    // Tamper with IV byte
    const tamperedIv = new Uint8Array(original.iv);
    tamperedIv[0] ^= 0xff; // Flip first byte
    const tamperedIvRecord: EncryptedRecord = {
      ...original,
      iv: tamperedIv
    };
    await expect(vault.decryptRecord(tamperedIvRecord)).rejects.toThrow();
  });

  it('enforces memory-only lock state lifecycle', async () => {
    const vault = new CryptoVault();
    expect(vault.isLocked()).toBe(true);

    // Encrypting or decrypting while locked must fail
    await expect(vault.encryptRecord('Test')).rejects.toThrow(/locked/i);

    // Unlock vault
    await vault.unlock('MasterKey_456');
    expect(vault.isLocked()).toBe(false);

    const record = await vault.encryptRecord('Ghi chép an toàn');
    expect(await vault.decryptRecord(record)).toBe('Ghi chép an toàn');

    // Lock vault - clears keys from RAM
    vault.lock();
    expect(vault.isLocked()).toBe(true);
    await expect(vault.encryptRecord('Sau khi lock')).rejects.toThrow(/locked/i);
    await expect(vault.decryptRecord(record)).rejects.toThrow(/locked/i);
  });

  it('generates non-extractable CryptoKey instances', async () => {
    const vault = new CryptoVault();
    const salt = new Uint8Array(16);
    const key = await vault.deriveKey('TestPassword', salt, 100000);

    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.extractable).toBe(false);
    expect((key.algorithm as any).name).toBe('AES-GCM');
    expect((key.algorithm as any).length).toBe(256);

    // Attempting to export a non-extractable key must reject
    const cryptoSubtle = (typeof window !== 'undefined' ? window.crypto : globalThis.crypto).subtle;
    await expect(cryptoSubtle.exportKey('raw', key)).rejects.toThrow();
  });

  it('supports JSON and Base64 serialization for persistence and export', async () => {
    const vault = new CryptoVault();
    await vault.unlock('SerializationPass');

    const record = await vault.encryptRecord('Dữ liệu lưu trữ IndexedDB hoặc file backup');
    const serialized = serializeEncryptedRecord(record);
    expect(typeof serialized).toBe('string');

    // Verify it parses as valid JSON with expected serialized properties
    const parsed = JSON.parse(serialized);
    expect(parsed).toHaveProperty('ciphertext');
    expect(parsed).toHaveProperty('iv');
    expect(parsed).toHaveProperty('salt');
    expect(parsed).toHaveProperty('version', 1);
    expect(parsed).toHaveProperty('algorithm', 'AES-GCM-256');

    // Deserialize back into EncryptedRecord
    const deserialized = deserializeEncryptedRecord(serialized);
    expect(deserialized.iv).toBeInstanceOf(Uint8Array);
    expect(deserialized.iv.length).toBe(12);
    expect(deserialized.salt).toBeInstanceOf(Uint8Array);
    expect(deserialized.salt.length).toBe(16);

    // Direct string decryption via vault helper
    const decryptedFromString = await vault.decryptRecord(serialized);
    expect(decryptedFromString).toBe('Dữ liệu lưu trữ IndexedDB hoặc file backup');

    // Decrypt deserialized record
    const decryptedFromObj = await vault.decryptRecord(deserialized);
    expect(decryptedFromObj).toBe('Dữ liệu lưu trữ IndexedDB hoặc file backup');
  });

  it('rotates password atomically across records', async () => {
    const vault = new CryptoVault();
    await vault.unlock('OldPassword123');

    const text1 = 'Nhật ký trang 1';
    const text2 = 'Nhật ký trang 2';
    const rec1 = await vault.encryptRecord(text1);
    const rec2 = await vault.encryptRecord(text2);

    // Rotate password to NewPassword456
    const rotated = await vault.rotatePassword('OldPassword123', 'NewPassword456', [rec1, rec2]);
    expect(rotated.length).toBe(2);

    // Vault should now be unlocked with the new password
    expect(vault.isLocked()).toBe(false);
    expect(await vault.decryptRecord(rotated[0])).toBe(text1);
    expect(await vault.decryptRecord(rotated[1])).toBe(text2);

    // Old records cannot be decrypted by the newly keyed vault
    await expect(vault.decryptRecord(rec1)).rejects.toThrow();

    // Rejection on invalid old password without corrupting records
    const badRotateVault = new CryptoVault();
    await badRotateVault.unlock('AnotherPass');
    await expect(
      badRotateVault.rotatePassword('WrongOldPass', 'BrandNewPass', [rec1, rec2])
    ).rejects.toThrow();
  });

  it('encrypts and decrypts large 25,000+ character text with Vietnamese diacritics', async () => {
    const vault = new CryptoVault();
    await vault.unlock('VietnameseUnicodeStressTest');

    const paragraph = 'Góc tĩnh lặng nơi tâm hồn tìm về chốn an yên, buông bỏ muộn phiền thường nhật. ';
    const largeBody = paragraph.repeat(300); // ~24,000 characters
    expect(largeBody.length).toBeGreaterThan(20000);

    const encrypted = await vault.encryptRecord(largeBody);
    const decrypted = await vault.decryptRecord(encrypted);

    expect(decrypted).toBe(largeBody);
  });

  it('handles empty string properly', async () => {
    const vault = new CryptoVault();
    await vault.unlock('EmptyStringTest');

    const encrypted = await vault.encryptRecord('');
    expect(encrypted.ciphertext.length).toBeGreaterThan(0); // Contains GCM auth tag
    const decrypted = await vault.decryptRecord(encrypted);
    expect(decrypted).toBe('');
  });

  it('rejects empty or invalid password during unlock', async () => {
    const vault = new CryptoVault();
    await expect(vault.unlock('')).rejects.toThrow(/password/i);
    await expect(vault.unlock(null as any)).rejects.toThrow(/password/i);
    expect(vault.isLocked()).toBe(true);
  });

  it('supports rotateKey as an alias for rotatePassword', async () => {
    const vault = new CryptoVault();
    await vault.unlock('KeyA');
    const rec = await vault.encryptRecord('Thử nghiệm alias rotateKey');

    const rotated = await vault.rotateKey('KeyA', 'KeyB', [rec]);
    expect(rotated.length).toBe(1);
    expect(await vault.decryptRecord(rotated[0])).toBe('Thử nghiệm alias rotateKey');
  });

  it('decrypts cleanly across vault instances when initialized with the same salt', async () => {
    const vault1 = new CryptoVault();
    await vault1.unlock('SharedSecretPass');
    const record = await vault1.encryptRecord('Nội dung chia sẻ an toàn');

    // Create vault2 with vault1's salt
    const vault2 = new CryptoVault({ salt: vault1.getSalt() });
    await vault2.unlock('SharedSecretPass');

    const decrypted = await vault2.decryptRecord(record);
    expect(decrypted).toBe('Nội dung chia sẻ an toàn');
  });

  it('decrypts record with custom salt when vault is unlocked with baseKey', async () => {
    const vault = new CryptoVault();
    await vault.unlock('UnifiedPassword');

    // Record created with a custom 16-byte salt
    const customSalt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const vaultCustom = new CryptoVault({ salt: customSalt });
    await vaultCustom.unlock('UnifiedPassword');
    const recordWithCustomSalt = await vaultCustom.encryptRecord('Ghi chép với salt tùy biến');

    // Decrypting on standard vault dynamically uses the record's salt
    const decrypted = await vault.decryptRecord(recordWithCustomSalt);
    expect(decrypted).toBe('Ghi chép với salt tùy biến');
  });

  it('rejects malformed or invalid serialized records', () => {
    expect(() => deserializeEncryptedRecord('not-json')).toThrow();
    expect(() => deserializeEncryptedRecord(JSON.stringify({}))).toThrow(/missing required fields/i);
    expect(() => deserializeEncryptedRecord(JSON.stringify({ ciphertext: 123 }))).toThrow(/missing required fields/i);
  });

  it('guarantees zero plaintext leakage in serialized or encrypted representation', async () => {
    const vault = new CryptoVault();
    await vault.unlock('LeakCheckPassword');

    const secretSensitiveThought = 'Bí mật thầm kín không bao giờ được lộ ra ngoài';
    const encrypted = await vault.encryptRecord(secretSensitiveThought);
    const serialized = serializeEncryptedRecord(encrypted);

    expect(encrypted.ciphertext).not.toContain(secretSensitiveThought);
    expect(serialized).not.toContain(secretSensitiveThought);
    expect(JSON.stringify(encrypted)).not.toContain(secretSensitiveThought);
  });
});

