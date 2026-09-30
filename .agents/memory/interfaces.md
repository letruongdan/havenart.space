# Haven Art — Module Interface Contracts

This document specifies the public TypeScript interfaces and module boundaries across the Haven Art application. Agents must consume these official interfaces rather than bypassing encapsulation or accessing internal primitives directly.

---

## 1. Journal Repository Interface

- **Owner:** Agent A4 (Journal & Storage Lead)
- **Primary Consumers:** Agent A3 (Frontend/UI), Agent A10 (QA)
- **Constraint:** UI components must never access IndexedDB directly; all data operations must route through `JournalRepository`.

```typescript
export interface JournalEntry {
  id: string;
  createdAt: number; // Unix timestamp ms
  updatedAt: number; // Unix timestamp ms
  content: string; // Plaintext or decrypted content
  isEncrypted: boolean;
  deletedAt?: number | null; // Soft-delete timestamp
}

export interface NewEntryInput {
  content: string;
  isEncrypted?: boolean;
}

export interface EntryFilter {
  includeDeleted?: boolean;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface JournalRepository {
  createEntry(input: NewEntryInput): Promise<JournalEntry>;
  updateEntry(id: string, patch: Partial<Pick<JournalEntry, 'content' | 'isEncrypted'>>): Promise<JournalEntry>;
  getEntry(id: string): Promise<JournalEntry | null>;
  listEntries(filter?: EntryFilter): Promise<JournalEntry[]>;
  softDeleteEntry(id: string): Promise<void>;
  undoDelete(id: string): Promise<void>;
  purgeExpiredDeletes(retentionDays?: number): Promise<number>;
  saveDraft(content: string): Promise<void>;
  getDraft(): Promise<string | null>;
  clearDraft(): Promise<void>;
}
```

---

## 2. Crypto Vault Interface

- **Owner:** Agent A5 (Security & Cryptography Lead)
- **Primary Consumers:** Agent A4 (Journal), Agent A13 (Red-Team)
- **Constraint:** Callers must not implement WebCrypto primitives or handle raw key derivations directly; passphrases must not be logged or persisted.

```typescript
export interface EncryptedPayload {
  version: number;
  ciphertext: string; // Base64-encoded AES-GCM ciphertext
  iv: string; // Base64-encoded 12-byte IV
  salt: string; // Base64-encoded PBKDF2 salt
}

export interface CryptoVault {
  isLocked(): boolean;
  hasPassphrase(): Promise<boolean>;
  setupPassphrase(passphrase: string): Promise<void>;
  unlock(passphrase: string): Promise<boolean>;
  lock(): void;
  encryptRecord(plaintext: string): Promise<EncryptedPayload>;
  decryptRecord(payload: EncryptedPayload): Promise<string>;
  rotateKey(currentPassphrase: string, newPassphrase: string): Promise<void>;
}
```

---

## 3. Audio Controller Interface

- **Owner:** Agent A6 (Audio & Soundscape Lead)
- **Primary Consumers:** Agent A3 (Frontend Gate & Dock), Agent A8 (PWA / Lifecycle)
- **Constraint:** UI must never create an `AudioContext` directly. All audio states must be governed through the `AudioEngine`.

```typescript
export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  license: string;
  sourceUrl: string;
  durationSeconds: number;
}

export interface AudioEngine {
  unlockAudio(): Promise<void>;
  play(trackId?: string): Promise<void>;
  pause(): void;
  setVolume(volume: number): void; // Range 0.0 to 1.0
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  getCurrentTrack(): AudioTrack | null;
  isPlaying(): boolean;
  destroy(): void;
}
```

---

## 4. Visual Controller Interface

- **Owner:** Agent A7 (Visuals & WebGL Shader Lead)
- **Primary Consumers:** Agent A3 (App Shell), Agent A8 (Visibility Lifecycle)
- **Constraint:** Shaders must degrade gracefully to static artwork when WebGL2 context is lost or when reduced-motion is requested.

```typescript
export type VisualMode = 'shader' | 'static';

export interface VisualCredit {
  id: string;
  title: string;
  artist: string;
  license: string;
  sourceUrl: string;
}

export interface VisualController {
  init(canvas: HTMLCanvasElement): Promise<void>;
  setVisualMode(mode: VisualMode): void;
  getVisualMode(): VisualMode;
  pauseVisuals(): void;
  resumeVisuals(): void;
  getCurrentCredit(): VisualCredit;
  destroy(): void;
}
```

---

## 5. Backup & Import Interface

- **Owner:** Agent A4 (Storage Lead), Agent A10 (QA Lead)
- **Primary Consumers:** Agent A3 (Settings Modal)
- **Constraint:** Imports must validate structure prior to performing write operations, with duplicate conflict resolution.

```typescript
export interface BackupPayload {
  formatVersion: '1.0';
  exportedAt: string; // ISO 8601 string
  entries: JournalEntry[];
  metadata: {
    totalEntries: number;
    encryptedEntries: number;
  };
}

export interface ImportOptions {
  deduplication: 'skip' | 'replace' | 'generate-new-ids';
}

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  replacedCount: number;
  errors: string[];
}

export interface BackupManager {
  exportData(): Promise<BackupPayload>;
  validateBackup(jsonString: string): { valid: boolean; errors: string[] };
  importData(jsonString: string, options: ImportOptions): Promise<ImportResult>;
}
```

---

## 6. Local Analytics Interface

- **Owner:** Agent A11 (Analytics Lead)
- **Primary Consumers:** All Agents
- **Constraint:** Strictly zero telemetry transmitted across the network; events track local counters only and never record journal content or personally identifiable information.

```typescript
export type LocalEventName =
  | 'session_started'
  | 'gate_entered'
  | 'audio_toggled'
  | 'visual_mode_toggled'
  | 'entry_saved'
  | 'entry_deleted'
  | 'vault_unlocked'
  | 'backup_exported';

export interface LocalAnalytics {
  trackLocalEvent(eventName: LocalEventName, metadata?: Record<string, number | boolean>): void;
  getEventCounts(): Promise<Record<LocalEventName, number>>;
  clearEvents(): Promise<void>;
}
```
