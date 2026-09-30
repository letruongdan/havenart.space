# Haven Art — Known Risks & Mitigations

This registry documents known technical and operational risks across all project domains. Agents must consult these items when implementing features and performing reviews.

---

## Risk Matrix Summary

| Risk ID | Domain | Severity | Likelihood | Status | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-01** | Storage | High | Medium | Monitored | A4 (Journal) |
| **RISK-02** | Visuals | Medium | High | Mitigated | A7 (Visuals) |
| **RISK-03** | Security | Critical | Low | Mitigated | A5 / A13 (Security/Red-Team) |
| **RISK-04** | Data Mgmt | High | Medium | Mitigated | A4 / A10 (Journal/QA) |
| **RISK-05** | Audio | Medium | High | Mitigated | A6 (Audio) |
| **RISK-06** | Persistence | High | Medium | Monitored | A4 / A8 (Journal/PWA) |

---

## Detailed Risk Profiles

### RISK-01: Tab Crash / Power Loss During Autosave or Key Rotation
- **Description:** A user abruptly closes their browser tab, experiences battery death, or the browser process crashes while an autosave write or cryptographic key rotation is in flight.
- **Potential Impact:** Partially written or orphaned records in IndexedDB; corrupted vault keys preventing decryption of reflections.
- **Mitigation Strategy:**
  1. Wrap all multi-step database operations within atomic IndexedDB transactions.
  2. Implement a write-ahead staging record (`drafts` store) distinct from the finalized `entries` store.
  3. During key rotation, write the newly re-encrypted records under a temporary version key before deprecating the previous key.
  4. Automatic draft recovery prompt on application initialization if an uncommitted draft is detected.

### RISK-02: WebGL2 Context Loss (`webglcontextlost`) on Mobile Hardware
- **Description:** Mobile GPUs frequently reclaim WebGL contexts when memory pressure spikes, tabs are switched, or when switching between apps.
- **Potential Impact:** Blank or corrupted canvas visual, UI freeze, unhandled exception in render loop.
- **Mitigation Strategy:**
  1. Register an active listener for `webglcontextlost` on the canvas element.
  2. Call `event.preventDefault()` to allow graceful degradation.
  3. Immediately and seamlessly transition opacity to the pre-rendered static artwork image fallback.
  4. Maintain zero Cumulative Layout Shift (CLS = 0) during fallback transition.

### RISK-03: Malicious Input Injection (XSS, Script Tags, Control Characters)
- **Description:** Attackers or malicious copy-pasting may insert `<script>`, `<iframe>`, javascript URLs, or Unicode control sequences into journal reflections.
- **Potential Impact:** Execution of malicious client-side code, theft of decrypted records from memory, or DOM manipulation.
- **Mitigation Strategy:**
  1. Absolute prohibition of `innerHTML` or `dangerouslySetInnerHTML` across all UI rendering paths.
  2. Render journal text strictly using native DOM `textContent` and Svelte text interpolations `{text}`.
  3. Mandatory adversarial fuzz testing conducted by A13 Red-Team using standard OWASP/XSS vector suites prior to release.

### RISK-04: Malformed Backup Import & ID Collisions
- **Description:** A user imports a corrupted JSON backup file, a file crafted with malicious schema payloads, or an export from another device containing colliding entry IDs.
- **Potential Impact:** Database corruption, silent overwriting of existing reflections, or application crashes.
- **Mitigation Strategy:**
  1. Validate imported JSON against a strict JSON Schema prior to performing any storage write.
  2. Run a pre-import analysis showing entry count, date range, and duplicate IDs found.
  3. Provide explicit conflict resolution options: merge with new UUIDs, skip duplicates, or replace.
  4. Perform import within an all-or-nothing transactional boundary.

### RISK-05: Web Audio Autoplay Policy & Background Tab Lifecycle
- **Description:** Modern browsers strictly block Web Audio contexts created prior to user interaction. Browsers also throttle audio/rendering timers when tabs are in the background.
- **Potential Impact:** Uncaught audio promise rejections, mute audio, or battery drain caused by background shader calculations.
- **Mitigation Strategy:**
  1. Defer all `AudioContext` instantiation and playback calls until explicit user interaction at the Gate screen.
  2. Listen for document `visibilitychange`: pause WebGL rendering loops immediately when hidden, and gracefully ramp audio volume down.
  3. Resume smoothly when the tab regains visibility.

### RISK-06: Browser Storage Eviction (Safari 7-day Cap & Storage Pressure)
- **Description:** Mobile Safari and Chromium browsers may evict IndexedDB storage under disk pressure or if the site is not added to the home screen within a certain timeframe.
- **Potential Impact:** Data loss for users who do not export backups.
- **Mitigation Strategy:**
  1. Explicitly request persistent storage permission via `navigator.storage.persist()`.
  2. Show unobtrusive reminders prompting users to download an encrypted JSON backup periodically.
  3. Provide full PWA manifest to encourage Add-to-Home-Screen (which grants durable storage privileges).
