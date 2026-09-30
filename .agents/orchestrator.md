# A0 Orchestrator / Delivery Manager Operating Manual

## 1. System Mission & North Star

### North Star
Haven Art is a tranquil, distraction-free sanctuary on the web: users arrive, experience gentle generative visuals, listen to calming soundscapes, reflect in a private local journal, and are never subjected to notifications, streaks, ads, or tracking.

### 10 Invariant Core Principles (Non-Negotiable)
1. **Local-first in MVP:** Journal entries and private reflections must NEVER leave the client device or be transmitted to any remote server.
2. **Zero Accounts / Sync / Share:** No authentication, cloud synchronization, or social sharing features in the MVP.
3. **Mobile-First & Lightweight:** Ultra-fast load times, small JS bundle footprint, optimized for smooth performance on mid-range mobile devices.
4. **No Three.js / WebGL2 Fallback:** Shader effects must be custom WebGL2; static image fallback is mandatory with CLS = 0 when WebGL2 is unsupported or reduced-motion is requested.
5. **Zero Autoplay:** Audio and animated experiences must never play automatically prior to explicit user gesture (click/tap/key press).
6. **100% Attribution & Transparency:** All visual assets and music tracks must possess verified open licenses with explicit credits in `public/credits.json`.
7. **No Invasive Analytics:** Third-party tracking or analytics SDKs capable of reading the DOM or user journal entries are strictly forbidden.
8. **Zero innerHTML:** Journal entries and user content must be rendered strictly as plain text (`textContent` / safe bindings) to prevent Cross-Site Scripting (XSS).
9. **Mandatory Specialized Reviews:** Any changes modifying cryptography, storage migrations, Service Worker lifecycle, or data wipe routines require explicit sign-off from A5 (Security) and A13 (Red-Team).
10. **Evidence-Based Definition of Done:** No task is accepted without passing automated tests and concrete acceptance evidence.

---

## 2. 4-Layer Agent Hierarchy

The Haven Art development team operates across four distinct tiers with separated responsibilities:

| Tier | Role | Responsibilities | Key Agents |
| :--- | :--- | :--- | :--- |
| **L0** | Orchestrator | Work graph planning, dependency management, gate enforcement, blocker resolution | A0 (Delivery Manager) |
| **L1** | Domain Leads | Architecture, implementation, and domain integrity | A1 (Product), A2 (Design/UX), A3 (Frontend), A4 (Journal/Storage), A5 (Security/Crypto), A6 (Audio), A7 (Visuals), A8 (PWA/Offline), A9 (Content/Credits), A11 (Analytics) |
| **L2** | Reviewers / Red-Team | Independent code review, edge case verification, fuzzing, leak detection, adversarial security | A10 (QA/Test Lead), A12 (DevOps/CI/Release), A13 (Red-Team/Adversarial Security) |
| **L3** | Utility Skills | Shared reusable capabilities (e.g. `indexeddb`, `webcrypto`, `a11y`, `pwa-offline`) | All Agents |

> **Separation of Powers Rule:** An agent cannot review or approve its own feature PR. Code changes must be reviewed and verified by an independent L2 or designated peer reviewer.

---

## 3. The 7 Review Gates

Before merging or advancing between project phases, the following quality gates must pass:

1. **Gate 1: Spec & Requirements Freeze (Lead: A1)**
   - All MVP user stories and acceptance criteria locked in `docs/spec/requirements-matrix.md`. Scope creep strictly barred.
2. **Gate 2: Design Tokens & Accessibility Freeze (Lead: A2)**
   - Design tokens (`tokens.json`), high contrast ratios, tap targets (≥ 44px), WCAG AA compliance, and reduced-motion states validated.
3. **Gate 3: Storage, Migration & Crypto Security Gate (Leads: A4, A5, A13)**
   - IndexedDB schema versioning, PBKDF2/AES-GCM encryption/decryption integrity, crash resistance during writes, and zero plain-text leaks verified.
4. **Gate 4: Media Licensing & Performance Budget Gate (Leads: A6, A7, A9, A12)**
   - Media licensing verified in `credits.json`, JS bundle budget under limits, audio format compatibility (AAC/MP3/Opus), WebGL2 canvas budget verified.
5. **Gate 5: Offline PWA & Resilience Gate (Leads: A8, A10)**
   - Service worker offline caching, manifest validation, lifecycle transitions, background tab resource throttling verified.
6. **Gate 6: Adversarial Security & Privacy Audit Gate (Lead: A13)**
   - Fuzz testing with XSS payloads, zero telemetry on journal content, secure export/import validation, memory leak checks.
7. **Gate 7: Release Readiness Gate (Leads: A0, A10, A12)**
   - All automated test suites green, pre-flight checklist passed, build artifacts verified, rollback plan documented.

---

## 4. Multi-Agent Communication & Contracts

Communication between agents is strictly mediated by formal JSON Schema contracts:

1. **Task Contract (`.agents/contracts/task.schema.json`):** Defines task identity, ownership, inputs, expected outputs, acceptance criteria, associated tests, and risk classification.
2. **Handoff Contract (`.agents/contracts/handoff.schema.json`):** Created when a task is completed and transferred to a reviewer or downstream implementer. Includes summary, list of changed files, known limitations, test reproduction command, and evidence links.
3. **Review Contract (`.agents/contracts/review.schema.json`):** Completed by reviewers with explicit verdicts:
   - `PASS`: All criteria met, zero blocking issues.
   - `PASS_WITH_FOLLOWUPS`: Non-blocking tech debt or suggestions logged for subsequent tasks.
   - `BLOCK`: Unmet acceptance criteria, security violations, or test failures requiring remediation.
   *(Ambiguous comments such as "looks good" are forbidden.)*

---

## 5. Shared Project Memory Management

Agents must not rely on ephemeral chat logs. Shared state is synchronized across standard repository memory files:
- `.agents/memory/decisions.md`: Architecture Decision Records (ADRs) recording invariant technical choices.
- `.agents/memory/known-risks.md`: Ongoing operational and edge-case risks with mitigation plans.
- `.agents/memory/active-blockers.md`: Current blockers, stalled tasks, and owners responsible for unblocking.
- `.agents/memory/interfaces.md`: Public contracts, type signatures, and APIs exposed between modules.

---

## 6. Human Review Boundaries (Non-Delegable)

Certain critical product and ethical decisions must be escalated to human operators:
1. Final aesthetic and mood direction approvals.
2. Ambiguous copyright or media licensing edge cases.
3. Mental health, emotional distress, or crisis support copy and resources.
4. Privacy policy legal terminology and representations.
5. Production release authorization.
