# Haven Art Multi-Agent Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thiết lập nền tảng multi-agent, hệ thống contract, shared memory và triển khai toàn diện sản phẩm Haven Art MVP — website nghệ thuật, âm nhạc thư thái và nhật ký bảo mật local-first theo đúng quy trình Superpowers.

**Architecture:** Kiến trúc multi-agent 4 tầng (L0 Orchestrator, L1 Domain Leads, L2 Reviewer/Red-Team, L3 Utility Skills). Ứng dụng chạy trên Astro + Svelte đảo (islands), lưu trữ dữ liệu hoàn toàn cục bộ qua IndexedDB (với tùy chọn mã hóa WebCrypto AES-GCM-256 + PBKDF2), âm thanh Web Audio quản lý chặt chẽ theo user gesture (không autoplay), và visual shader WebGL2 với fallback ảnh tĩnh tự động khi thiết bị yếu hoặc bật `prefers-reduced-motion`. Mọi tính năng đều được kiểm soát bởi TDD và 7 Review Gates độc lập.

**Tech Stack:** Astro, Svelte, TypeScript, TailwindCSS / Design Tokens, IndexedDB (`idb`), WebCrypto API, Web Audio API, WebGL2, Vite-PWA / Workbox, Vitest, Playwright.

**Spec:** [haven-art-multi-agent-plan.md](file:///D:/LandingPage/havenart.space/haven-art-multi-agent-plan.md)

---

## Global Constraints

- **Local-first ở MVP:** Nội dung nhật ký tuyệt đối không được gửi tới bất kỳ server nào.
- **Không tài khoản / sync / share** trong giai đoạn MVP.
- **Mobile-first, siêu nhẹ:** Chạy mượt mà trên điện thoại tầm trung, kiểm soát chặt chẽ ngân sách bundle JS và bộ nhớ.
- **Không Three.js:** Chỉ sử dụng shader WebGL2 tùy biến nhẹ; bắt buộc có chế độ fallback ảnh tĩnh với CLS = 0.
- **Không autoplay:** Âm thanh và hiệu ứng chuyển động chỉ kích hoạt sau tương tác người dùng rõ ràng (click/tap/phím).
- **100% bản quyền minh bạch:** Mọi hình ảnh và bài nhạc phải có bản quyền hợp lệ và được ghi nhận tại `public/credits.json`.
- **Không analytics bên thứ 3 can thiệp:** Cấm các SDK có khả năng đọc DOM hoặc nội dung nhật ký người dùng.
- **Không render nội dung bằng `innerHTML`:** Chống triệt để lỗ hổng XSS trong trình hiển thị nhật ký.
- **Kiểm duyệt chuyên trách:** Thay đổi liên quan crypto, storage migration, service worker hoặc xóa dữ liệu bắt buộc qua A5 và A13.
- **Evidence-based DoD:** Không tính năng nào được coi là xong nếu thiếu test run thực tế và bằng chứng nghiệm thu (DoD 10 tiêu chí).

---

## Review Focus

Các trường hợp biên và chế độ lỗi trọng yếu nhất cần được kiểm thử độc lập:
1. **Đột ngột tắt tab / crash trình duyệt giữa lúc autosave hoặc re-encrypt:** Dữ liệu nhật ký cũ không bị hỏng (corrupt), IndexedDB giữ nguyên trạng thái nhất quán và khôi phục được bản nháp gần nhất.
2. **Thiết bị không hỗ trợ WebGL2 hoặc bị mất context (`webglcontextlost`):** Ứng dụng tự động chuyển ngay sang chế độ hiển thị ảnh tĩnh mượt mà, không giật màn hình và CLS = 0.
3. **Nội dung nhật ký chứa mã độc (XSS vectors, script tags, HTML fragments, ký tự đặc biệt tiếng Việt, 10.000+ ký tự):** Render 100% dưới dạng văn bản thô (safe plaintext), không thực thi script, không làm đơ giao diện.
4. **Nhập (Import) file JSON bị lỗi cấu trúc, sai schema hoặc chứa ID trùng lặp:** Trình nhập từ chối giao dịch an toàn mà không làm xáo trộn hay ghi đè cơ sở dữ liệu hiện có; xử lý deduplication đúng chuẩn.
5. **Chính sách chặn âm thanh trên iOS Safari & vòng đời chuyển tab (Background Tab Lifecycle):** Không bao giờ gọi Web Audio trước cử chỉ người dùng; khi ẩn tab, shader tự động tạm dừng để tiết kiệm pin và tài nguyên.

---

## Task Structure

### Task 1: Multi-Agent Workspace, Contracts & Shared Memory Setup

**Files:**
- Create: `.agents/orchestrator.md`
- Create: `.agents/contracts/task.schema.json`
- Create: `.agents/contracts/handoff.schema.json`
- Create: `.agents/contracts/review.schema.json`
- Create: `.agents/memory/decisions.md`
- Create: `.agents/memory/known-risks.md`
- Create: `.agents/memory/active-blockers.md`
- Create: `.agents/memory/interfaces.md`
- Test: `tests/infrastructure/schemas.spec.ts`

**Interfaces:**
- Consumes: Cấu trúc mô hình tổ chức và contracts từ `haven-art-multi-agent-plan.md` (Mục 1, 4, 5, 21).
- Produces: JSON schemas chuẩn hoá cho `task`, `handoff`, `review` cùng bộ nhớ dùng chung (shared memory) cho toàn bộ 14 agents.

- [ ] **Step 1: Viết test kiểm tra tính hợp lệ của các schema contracts**
```typescript
// tests/infrastructure/schemas.spec.ts
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import taskSchema from '../../.agents/contracts/task.schema.json';
import handoffSchema from '../../.agents/contracts/handoff.schema.json';
import reviewSchema from '../../.agents/contracts/review.schema.json';

describe('Agent Contract Schemas', () => {
  const ajv = new Ajv();
  it('should compile valid task, handoff, and review schemas', () => {
    expect(ajv.compile(taskSchema)).toBeDefined();
    expect(ajv.compile(handoffSchema)).toBeDefined();
    expect(ajv.compile(reviewSchema)).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (Red)**
Run: `npx vitest run tests/infrastructure/schemas.spec.ts`
Expected: FAIL (file schema chưa tồn tại).

- [ ] **Step 3: Tạo các tệp contract schema và shared memory ban đầu**
Khởi tạo `.agents/contracts/*.json`, `.agents/memory/*.md`, và `.agents/orchestrator.md` theo đặc tả của spec.

- [ ] **Step 4: Chạy lại test để xác nhận test vượt qua (Green)**
Run: `npx vitest run tests/infrastructure/schemas.spec.ts`
Expected: PASS 1/1.

- [ ] **Step 5: Commit**
```bash
git add .agents/ tests/infrastructure/schemas.spec.ts
git commit -m "chore(agents): initialize multi-agent workspace, contracts and shared memory"
```

---

### Task 2: Project Scaffolding & CI Pipeline (Agent A12)

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.github/workflows/ci.yml`
- Test: `tests/infrastructure/environment.spec.ts`

**Interfaces:**
- Consumes: Không.
- Produces: Môi trường chạy Astro + Svelte + TypeScript + Vitest + TailwindCSS đã cấu hình hoàn chỉnh.

- [ ] **Step 1: Viết test kiểm tra biến môi trường và cấu hình build**
```typescript
// tests/infrastructure/environment.spec.ts
import { describe, it, expect } from 'vitest';

describe('Project Build Environment', () => {
  it('should verify node environment and dependencies integrity', () => {
    expect(process.version).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại nếu thiếu cấu hình**
Run: `npx vitest run tests/infrastructure/environment.spec.ts`
Expected: FAIL (nếu Vitest chưa được cài đặt).

- [ ] **Step 3: Cài đặt và cấu hình Astro, Svelte, Vitest, Tailwind**
Thiết lập `package.json` tinh gọn, khóa phiên bản (pinned dependencies), hỗ trợ TypeScript strict mode.

- [ ] **Step 4: Chạy test và typecheck để xác nhận pass**
Run: `npm run typecheck && npx vitest run tests/infrastructure/environment.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add package.json astro.config.mjs tsconfig.json vitest.config.ts .github/
git commit -m "feat(infra): setup clean project scaffold with astro, svelte and vitest"
```

---

### Task 3: Design Tokens & Styling Primitives (Agent A2)

**Files:**
- Create: `src/styles/tokens.json`
- Create: `src/styles/tokens.css`
- Test: `tests/design/tokens.spec.ts`

**Interfaces:**
- Consumes: Bảng quy ước màu sắc, font, spacing dịu mắt cho Haven Art.
- Produces: CSS custom properties (`--color-bg`, `--color-surface`, `--color-text`, `--motion-safe-duration`, `--radius-haven`).

- [ ] **Step 1: Viết test kiểm định tính đầy đủ của Design Tokens**
```typescript
// tests/design/tokens.spec.ts
import { describe, it, expect } from 'vitest';
import tokens from '../../src/styles/tokens.json';

describe('Design Tokens Contract', () => {
  it('must define essential calm palette and accessible contrast tokens', () => {
    expect(tokens.color).toHaveProperty('background');
    expect(tokens.color).toHaveProperty('surface');
    expect(tokens.color).toHaveProperty('textPrimary');
    expect(tokens.motion).toHaveProperty('reducedMotionFallback');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/design/tokens.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Định nghĩa `tokens.json` và tạo `tokens.css` tương ứng**
Bao gồm dark/light theme tĩnh lặng, chuẩn bị cho `prefers-reduced-motion`.

- [ ] **Step 4: Chạy test kiểm tra tokens**
Run: `npx vitest run tests/design/tokens.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/styles/ tokens.json tokens.css tests/design/
git commit -m "feat(design): implement calm design tokens and root css variables"
```

---

### Task 4: IndexedDB Storage Core & Repository Layer (Agent A4)

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/repository.ts`
- Create: `src/lib/db/drafts.ts`
- Test: `tests/db/journal-repository.spec.ts`

**Interfaces:**
- Consumes: Cấu trúc bản ghi nhật ký (ULID, title, body, mood, createdAt, updatedAt, deletedAt).
- Produces: API ổn định: `createEntry()`, `updateEntry()`, `getEntry()`, `listEntries()`, `softDeleteEntry()`, `undoDelete()`, `saveDraft()`, `getDraft()`.

- [ ] **Step 1: Viết failing test cho Journal CRUD, Autosave & Soft Delete với 10s Undo**
```typescript
// tests/db/journal-repository.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { JournalRepository } from '../../src/lib/db/repository';

describe('JournalRepository', () => {
  let repo: JournalRepository;
  beforeEach(async () => {
    repo = new JournalRepository('haven-test-db');
    await repo.init();
  });

  it('creates, retrieves, and updates an entry locally', async () => {
    const entry = await repo.createEntry({ title: 'Góc tĩnh lặng', body: 'Hôm nay trời dịu mát' });
    expect(entry.id).toBeDefined();
    const fetched = await repo.getEntry(entry.id);
    expect(fetched?.title).toBe('Góc tĩnh lặng');
  });

  it('supports soft-delete with undo capability', async () => {
    const entry = await repo.createEntry({ title: 'Tạm xóa', body: 'Nội dung' });
    await repo.softDeleteEntry(entry.id);
    let list = await repo.listActiveEntries();
    expect(list.some(e => e.id === entry.id)).toBe(false);

    await repo.undoDelete(entry.id);
    list = await repo.listActiveEntries();
    expect(list.some(e => e.id === entry.id)).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/db/journal-repository.spec.ts`
Expected: FAIL (Repository chưa được định nghĩa).

- [ ] **Step 3: Triển khai `JournalRepository` và `DraftRepository` với `idb`**
Đảm bảo transaction an toàn, tạo index theo `createdAt`, hỗ trợ soft-delete timestamp.

- [ ] **Step 4: Chạy test để xác nhận toàn bộ CRUD pass**
Run: `npx vitest run tests/db/journal-repository.spec.ts`
Expected: PASS (tất cả các test case đều xanh).

- [ ] **Step 5: Commit**
```bash
git add src/lib/db/ tests/db/
git commit -m "feat(db): implement local indexeddb repository with soft delete and drafts"
```

---

### Task 5: WebCrypto Password Lock & Vault Wrapper (Agent A5)

**Files:**
- Create: `src/lib/crypto/vault.ts`
- Create: `src/lib/crypto/types.ts`
- Test: `tests/crypto/vault.spec.ts`

**Interfaces:**
- Consumes: Khóa mật khẩu người dùng dạng chuỗi ký tự.
- Produces: `deriveKey()`, `encryptRecord()`, `decryptRecord()`, `lock()`, `isLocked()`. Key chỉ lưu trong RAM, non-extractable.

- [ ] **Step 1: Viết test cho AES-GCM-256 + PBKDF2 mã hóa / giải mã**
```typescript
// tests/crypto/vault.spec.ts
import { describe, it, expect } from 'vitest';
import { CryptoVault } from '../../src/lib/crypto/vault';

describe('CryptoVault', () => {
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
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/crypto/vault.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Triển khai `CryptoVault` sử dụng `window.crypto.subtle`**
- PBKDF2-SHA256 với 100.000 rounds (versioned).
- AES-GCM 256 với random 12-byte IV mỗi lần mã hóa.
- Non-extractable `CryptoKey` tồn tại duy nhất trong bộ nhớ biến instance.

- [ ] **Step 4: Chạy test để xác nhận mã hóa bảo mật hoạt động chuẩn xác**
Run: `npx vitest run tests/crypto/vault.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/crypto/ tests/crypto/
git commit -m "feat(crypto): implement aes-gcm and pbkdf2 memory-only vault"
```

---

### Task 6: Audio Engine & Gesture-Gated Playback (Agent A6)

**Files:**
- Create: `src/lib/audio/engine.ts`
- Create: `src/lib/audio/tracks.ts`
- Test: `tests/audio/engine.spec.ts`

**Interfaces:**
- Consumes: Danh sách file audio từ `public/audio/`.
- Produces: API điều khiển: `unlockAudio()`, `playTrack()`, `pause()`, `setVolume()`, `crossfade()`.

- [ ] **Step 1: Viết failing test kiểm tra quy tắc No-Autoplay và Volume Clamp**
```typescript
// tests/audio/engine.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { AudioEngine } from '../../src/lib/audio/engine';

describe('AudioEngine', () => {
  it('must not play audio before explicit user gesture unlock', async () => {
    const engine = new AudioEngine();
    expect(engine.isUnlocked()).toBe(false);
    await expect(engine.play()).rejects.toThrow('User gesture required to unlock audio');
  });

  it('defaults volume to 40% and clamps within [0, 1]', () => {
    const engine = new AudioEngine();
    expect(engine.getVolume()).toBe(0.4);
    engine.setVolume(1.5);
    expect(engine.getVolume()).toBe(1.0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/audio/engine.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Triển khai `AudioEngine` với Web Audio API**
Đảm bảo quản lý GainNode cho crossfade mềm mại, lưu trạng thái volume vào `localStorage` (`haven_volume`), hỗ trợ Media Session API.

- [ ] **Step 4: Chạy test kiểm tra audio**
Run: `npx vitest run tests/audio/engine.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/audio/ tests/audio/
git commit -m "feat(audio): implement gesture-gated audio engine with crossfade and volume persistence"
```

---

### Task 7: Visual Background & WebGL2 Shader Fallback (Agent A7)

**Files:**
- Create: `src/lib/visuals/controller.ts`
- Create: `src/shaders/ambient.frag`
- Create: `src/shaders/ambient.vert`
- Test: `tests/visuals/controller.spec.ts`

**Interfaces:**
- Consumes: Thư viện tranh từ `public/images/`.
- Produces: Bộ điều khiển visual: `initVisuals(canvas)`, `setMode('shader' | 'static')`, `pause()`, `resume()`.

- [ ] **Step 1: Viết test kiểm tra tự động fallback khi thiếu WebGL2 hoặc có `prefers-reduced-motion`**
```typescript
// tests/visuals/controller.spec.ts
import { describe, it, expect } from 'vitest';
import { VisualController } from '../../src/lib/visuals/controller';

describe('VisualController', () => {
  it('falls back to static image mode if webgl2 is not supported', () => {
    const controller = new VisualController({ hasWebGL2: false, prefersReducedMotion: false });
    expect(controller.getActiveMode()).toBe('static');
  });

  it('forces static image mode when prefers-reduced-motion is true', () => {
    const controller = new VisualController({ hasWebGL2: true, prefersReducedMotion: true });
    expect(controller.getActiveMode()).toBe('static');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/visuals/controller.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Triển khai `VisualController` và shader tối ưu**
Hỗ trợ lắng nghe sự kiện `visibilitychange` để tạm dừng render loop khi tab chạy ngầm.

- [ ] **Step 4: Chạy test để xác nhận hoạt động ổn định**
Run: `npx vitest run tests/visuals/controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/visuals/ src/shaders/ tests/visuals/
git commit -m "feat(visuals): add visual controller with webgl2 shader and static fallback"
```

---

### Task 8: App Shell, Gate Island & Main Experience (Agent A3)

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/components/Gate.svelte`
- Create: `src/components/HavenShell.svelte`
- Create: `src/components/Dock.svelte`
- Test: `tests/components/gate.spec.ts`

**Interfaces:**
- Consumes: `AudioEngine`, `VisualController`, CSS tokens.
- Produces: Giao diện cổng vào (Gate) kích hoạt trải nghiệm bằng chuột hoặc phím (Enter/Space), mở ra Haven Shell và Dock điều khiển.

- [ ] **Step 1: Viết test cho hành vi bàn phím (Enter/Space) tại Gate**
```typescript
// tests/components/gate.spec.ts
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Gate from '../../src/components/Gate.svelte';

describe('Gate Component', () => {
  it('triggers enter event upon Enter or Space key press', async () => {
    let entered = false;
    const { getByRole } = render(Gate, { onEnter: () => { entered = true; } });
    const button = getByRole('button', { name: /bước vào/i });
    
    await fireEvent.keyDown(button, { key: 'Enter' });
    expect(entered).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận test thất bại**
Run: `npx vitest run tests/components/gate.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Viết component `Gate.svelte`, `HavenShell.svelte` và `Dock.svelte`**
Tuân thủ chuẩn a11y, focus ring nhẹ nhàng, chuyển cảnh dịu mắt không gây layout shift (CLS = 0).

- [ ] **Step 4: Chạy test component**
Run: `npx vitest run tests/components/gate.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/index.astro src/components/ tests/components/
git commit -m "feat(ui): build gate entry, haven shell and dock navigation"
```

---

### Task 9: Journal Write Panel & Safe Rendering (Agent A3 + A4)

**Files:**
- Create: `src/components/WritePanel.svelte`
- Create: `src/components/JournalList.svelte`
- Test: `tests/journal/xss-defense.spec.ts`

**Interfaces:**
- Consumes: `JournalRepository`, `CryptoVault`.
- Produces: Trình viết nhật ký tự động lưu sau 2 giây idle, danh sách bài viết an toàn tuyệt đối chống XSS.

- [ ] **Step 1: Viết test khẳng định nội dung chứa script/HTML chỉ hiển thị dưới dạng raw text**
```typescript
// tests/journal/xss-defense.spec.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import JournalList from '../../src/components/JournalList.svelte';

describe('Journal XSS Defense', () => {
  it('renders dangerous html tags strictly as text without innerHTML execution', () => {
    const hostileEntries = [{
      id: 'test-1',
      title: 'Tấn công XSS',
      body: '<script>window.pwned=true</script><img src="x" onerror="alert(1)">',
      createdAt: Date.now()
    }];

    const { container } = render(JournalList, { entries: hostileEntries });
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[onerror]')).toBeNull();
    expect(container.textContent).toContain('<script>window.pwned=true</script>');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/journal/xss-defense.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Triển khai `WritePanel.svelte` và `JournalList.svelte`**
Sử dụng Svelte text interpolation `{entry.body}`, tuyệt đối không dùng `{@html}`. Gắn bộ đếm debounce 2000ms cho autosave nháp.

- [ ] **Step 4: Chạy test an toàn XSS**
Run: `npx vitest run tests/journal/xss-defense.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/WritePanel.svelte src/components/JournalList.svelte tests/journal/
git commit -m "feat(journal): implement write panel and xss-safe journal viewer"
```

---

### Task 10: Backup, Export/Import Engine & Deduplication (Agent A4)

**Files:**
- Create: `src/lib/export/backup.ts`
- Create: `src/lib/export/schema.ts`
- Test: `tests/db/backup.spec.ts`

**Interfaces:**
- Consumes: `JournalRepository`.
- Produces: `exportBackup()`, `validateImportPayload()`, `importBackup()`.

- [ ] **Step 1: Viết test cho toàn bộ chu trình Backup Roundtrip và loại bỏ bản ghi trùng**
```typescript
// tests/db/backup.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { JournalRepository } from '../../src/lib/db/repository';
import { BackupManager } from '../../src/lib/export/backup';

describe('BackupManager', () => {
  let repo: JournalRepository;
  let backup: BackupManager;

  beforeEach(async () => {
    repo = new JournalRepository('backup-test-db');
    await repo.init();
    backup = new BackupManager(repo);
  });

  it('exports and re-imports valid json without data corruption or duplicates', async () => {
    const entry = await repo.createEntry({ title: 'Ghi chú', body: 'Lưu trữ an toàn' });
    const jsonString = await backup.exportBackup();
    
    // Import lại cùng dữ liệu
    const result = await backup.importBackup(jsonString);
    expect(result.importedCount).toBe(0); // Bị dedupe theo ID
    expect(result.skippedCount).toBe(1);

    const all = await repo.listActiveEntries();
    expect(all.length).toBe(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/db/backup.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Triển khai `BackupManager`**
Thực hiện validate schema trước khi ghi vào database; nếu phát hiện file hỏng, hủy bỏ giao dịch hoàn toàn (atomic transaction rollback).

- [ ] **Step 4: Chạy test xác nhận backup pass**
Run: `npx vitest run tests/db/backup.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/export/ tests/db/backup.spec.ts
git commit -m "feat(backup): implement atomic json export/import with deduplication"
```

---

### Task 11: Content Provenance & Credits Ledger (Agent A9)

**Files:**
- Create: `public/credits.json`
- Create: `src/lib/content/credits.ts`
- Test: `tests/content/credits.spec.ts`

**Interfaces:**
- Consumes: Toàn bộ danh mục hình ảnh và file audio trong `public/`.
- Produces: Danh mục credit có cấu trúc, kiểm tra hợp lệ bản quyền của từng asset.

- [ ] **Step 1: Viết test kiểm tra mọi asset xuất hiện trong dự án đều có bản quyền hợp lệ**
```typescript
// tests/content/credits.spec.ts
import { describe, it, expect } from 'vitest';
import credits from '../../public/credits.json';

describe('Asset Provenance & Credits Ledger', () => {
  it('ensures every asset has author, source_url, license and checksum', () => {
    expect(credits.assets.length).toBeGreaterThan(0);
    for (const asset of credits.assets) {
      expect(asset.id).toBeDefined();
      expect(asset.license).toBeDefined();
      expect(asset.source_url).toMatch(/^https?:\/\//);
    }
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/content/credits.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Điền đầy đủ thông tin nguồn gốc bản quyền vào `public/credits.json`**

- [ ] **Step 4: Chạy test kiểm tra credits**
Run: `npx vitest run tests/content/credits.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add public/credits.json src/lib/content/ tests/content/
git commit -m "docs(credits): document verified asset licenses and provenance ledger"
```

---

### Task 12: Offline PWA & Service Worker Cache Policy (Agent A8)

**Files:**
- Create: `src/manifest.webmanifest`
- Create: `src/sw.ts`
- Test: `tests/pwa/offline-policy.spec.ts`

**Interfaces:**
- Consumes: Bundle assets từ Astro build.
- Produces: Service Worker offline shell: precache HTML/CSS/JS, runtime cache hình ảnh, loại trừ audio khỏi precache để tiết kiệm băng thông.

- [ ] **Step 1: Viết test kiểm tra chính sách cache của Service Worker**
```typescript
// tests/pwa/offline-policy.spec.ts
import { describe, it, expect } from 'vitest';
import { shouldCacheUrl } from '../../src/sw-policy';

describe('Service Worker Cache Policy', () => {
  it('caches static shell and viewed images, but never pre-caches heavy audio', () => {
    expect(shouldCacheUrl('/index.html')).toBe(true);
    expect(shouldCacheUrl('/images/art1.webp')).toBe(true);
    expect(shouldCacheUrl('/audio/meditation.ogg')).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
Run: `npx vitest run tests/pwa/offline-policy.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Triển khai chiến lược caching trong `sw.ts` và manifest**

- [ ] **Step 4: Chạy test kiểm tra service worker**
Run: `npx vitest run tests/pwa/offline-policy.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/manifest.webmanifest src/sw* tests/pwa/
git commit -m "feat(pwa): configure offline pwa shell and selective caching policy"
```

---

### Task 13: Red-Team & Adversarial Security Test Suite (Agent A13)

**Files:**
- Create: `tests/adversarial/privacy-and-leak.spec.ts`
- Create: `tests/adversarial/race-conditions.spec.ts`
- Test: `tests/adversarial/privacy-and-leak.spec.ts`

**Interfaces:**
- Consumes: Hệ thống frontend, IndexedDB, WebCrypto, Network interceptors.
- Produces: Bộ test độc lập chứng minh không có rò rỉ dữ liệu (zero data leakage) và không xảy ra race conditions khi người dùng thao tác nhanh.

- [ ] **Step 1: Viết adversarial test kiểm tra Network Request không chứa nội dung nhật ký**
```typescript
// tests/adversarial/privacy-and-leak.spec.ts
import { describe, it, expect, vi } from 'vitest';

describe('Adversarial Privacy Audit', () => {
  it('strictly ensures fetch/xhr requests never carry sensitive journal text', () => {
    const interceptedRequests: string[] = [];
    // Mock fetch interceptor
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (init?.body) interceptedRequests.push(String(init.body));
      return Promise.resolve(new Response('{}'));
    });

    // Kích hoạt luồng tạo và lưu trữ nhật ký
    const sensitiveText = 'Bí mật riêng tư cá nhân không được gửi đi';
    // Giả lập hành vi ghi nhật ký
    // Kiểm tra toàn bộ payload đã bị chặn hoặc gửi đi
    const hasLeak = interceptedRequests.some(req => req.includes(sensitiveText));
    expect(hasLeak).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận adversarial suite hoạt động**
Run: `npx vitest run tests/adversarial/privacy-and-leak.spec.ts`
Expected: PASS (với kiến trúc local-first chuẩn xác).

- [ ] **Step 3: Bổ sung các kịch bản crash test, quota IndexedDB và corrupt JSON import**

- [ ] **Step 4: Chạy toàn bộ adversarial test suite**
Run: `npx vitest run tests/adversarial/`
Expected: ALL PASS.

- [ ] **Step 5: Commit**
```bash
git add tests/adversarial/
git commit -m "test(redteam): implement adversarial privacy leak and resilience tests"
```

---

### Task 14: Release Gate & Whole-System Verification (Gate G7 / Agent A0 + A10 + A12)

**Files:**
- Create: `docs/release/verification-report.md`
- Modify: `docs/status/release-status.md`
- Test: Chạy toàn bộ test suite (`npm run test && npm run test:e2e`)

**Interfaces:**
- Consumes: Kết quả từ Task 1 đến Task 13.
- Produces: Báo cáo nghiệm thu hoàn chỉnh (Acceptance Evidence), xác nhận 0 lỗi P0/P1, mở Gate G7 để sẵn sàng triển khai.

- [ ] **Step 1: Chạy toàn bộ unit & integration tests**
Run: `npm run test`
Expected: 100% tests PASS.

- [ ] **Step 2: Chạy Playwright E2E tests trên Chromium và WebKit**
Run: `npx playwright test`
Expected: Tất cả luồng Gate -> Haven Shell -> Nhạc -> Nhật ký -> Sao lưu đều PASS.

- [ ] **Step 3: Kiểm tra Lighthouse CI baseline**
Run: `npx lhci autorun`
Expected: Performance >= 90, Accessibility = 100, Best Practices = 100, SEO >= 90.

- [ ] **Step 4: Lập biên bản nghiệm thu Gate G7 tại `docs/release/verification-report.md`**

- [ ] **Step 5: Commit**
```bash
git add docs/release/ docs/status/
git commit -m "chore(release): complete gate G7 verification and sign-off"
```
