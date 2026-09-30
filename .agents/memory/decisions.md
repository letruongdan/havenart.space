# Haven Art — Architecture Decision Records (ADRs)

This document records the foundational architecture and engineering decisions governing the Haven Art project. All agents must consult and adhere to these decisions prior to implementing or reviewing code.

---

## ADR-001: Local-First Architecture with IndexedDB

- **Status:** ACCEPTED
- **Date:** 2026-09-30
- **Context:** Haven Art is designed as a private emotional refuge. Users must trust that their sensitive journal entries remain strictly confidential.
- **Decision:** All journal content and reflections will reside entirely within the user's browser using client-side IndexedDB (via the lightweight `idb` wrapper). No remote databases, backend API endpoints, cloud syncing, or user accounts are permitted in the MVP.
- **Consequences:** Zero risk of server-side data breach or eavesdropping. Data persistence depends on client device storage; users are provided explicit export/import tools for manual backups.

---

## ADR-002: Zero Autoplay and Explicit User Gesture Unlock

- **Status:** ACCEPTED
- **Date:** 2026-09-30
- **Context:** Modern web browsers (especially iOS Safari and Android Chrome) enforce strict autoplay restrictions on Web Audio, muting or blocking uninitiated audio context playback. Unsolicited audio also violates the peaceful, opt-in sanctuary experience.
- **Decision:** No audio or animated sequence will play automatically upon page load. Users are greeted at the Gate screen and must perform a deliberate user gesture (click/tap "Enter Haven" or toggle audio) before the Web Audio `AudioContext` is created or resumed.
- **Consequences:** Ensures 100% compliance with browser media policies, eliminates audio stutter/blocking errors, and establishes an intentional threshold for the user.

---

## ADR-003: Custom WebGL2 Shaders with Static Image Fallback (No Three.js)

- **Status:** ACCEPTED
- **Date:** 2026-09-30
- **Context:** Heavy 3D rendering engines like Three.js inflate bundle sizes (often >600KB) and cause battery drain, slow render times, or crashes on low-to-mid-tier mobile hardware.
- **Decision:** Visual backdrops are implemented with lightweight custom WebGL2 fragment shaders (~5KB) or CSS canvas blends. Three.js is explicitly prohibited. When WebGL2 is unsupported, when `webglcontextlost` occurs, or when `prefers-reduced-motion: reduce` is active, the system automatically transitions to a high-quality static artwork fallback with CLS = 0.
- **Consequences:** Minimal bundle overhead, 60fps performance on mobile devices, and graceful degradation for accessibility and low-power devices.

---

## ADR-004: Client-Side WebCrypto (PBKDF2 + AES-GCM-256) for Encrypted Vault

- **Status:** ACCEPTED
- **Date:** 2026-09-30
- **Context:** Users who share devices or want heightened privacy need the option to protect their journals with a passphrase.
- **Decision:** Implement client-side encryption using the standard W3C WebCrypto API. Keys are derived from user passphrases using PBKDF2 (SHA-256, minimum 100,000 iterations, unique random salt per vault) and encrypted using AES-GCM-256 with unique 12-byte initialization vectors (IVs) per record. Passphrases are never stored in memory longer than needed, and never written to storage.
- **Consequences:** Cryptographically robust local privacy. Inability to recover entries if the user forgets their passphrase; clear warnings must be presented during password setup.

---

## ADR-005: Strict Text-Only Rendering (No innerHTML) for Journal Reflections

- **Status:** ACCEPTED
- **Date:** 2026-09-30
- **Context:** Storing and rendering arbitrary user text creates risks of Cross-Site Scripting (XSS) if malicious scripts, HTML tags, or event handlers are injected and parsed via `innerHTML`.
- **Decision:** The application will strictly render user journal entries using safe text bindings (`textContent`, Svelte `{text}` interpolation). Use of `innerHTML`, `outerHTML`, or `v-html`/equivalent unsafe HTML injections is strictly prohibited in journal display components.
- **Consequences:** Complete immunity from DOM-based XSS attacks on stored entries, preserving security even if malformed HTML is pasted into the editor.

---

## ADR-006: 4-Tier Multi-Agent Model with Formal JSON Schema Contracts

- **Status:** ACCEPTED
- **Date:** 2026-09-30
- **Context:** Coordinating 14 specialized autonomous agents requires strict division of labor, predictable communication interfaces, and prevention of self-approval loops.
- **Decision:** Adopt a 4-tier hierarchy: L0 Orchestrator, L1 Domain Leads, L2 Independent Reviewers & Red-Team, and L3 Reusable Skills. All task assignments, handoffs, and reviews must conform to strict JSON schemas (`task.schema.json`, `handoff.schema.json`, `review.schema.json`). Authors cannot act as sole reviewers for their own work.
- **Consequences:** Transparent audit trails, elimination of ambiguity in reviews, and automated verification of deliverables against schemas.

---

## ADR-007: Privacy-Preserving Zero-Telemetry Policy

- **Status:** ACCEPTED
- **Date:** 2026-09-30
- **Context:** Commercial analytics packages often collect IP addresses, device identifiers, and can inadvertently scrape text nodes from the DOM.
- **Decision:** Prohibit third-party analytics SDKs (Google Analytics, Mixpanel, etc.). Only privacy-respecting, zero-telemetry local event counters (stored in IndexedDB or memory) may be utilized for local performance benchmarking. No tracking data leaves the browser.
- **Consequences:** Guarantees total user confidentiality, reduces network overhead, and simplifies regulatory compliance (GDPR/CCPA exemption for local data).
